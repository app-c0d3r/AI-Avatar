import os
import json
from typing import Optional, AsyncGenerator
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from openai import AsyncOpenAI

# Load environment variables from .env file
load_dotenv()

app = FastAPI(title="AI Avatar Backend", version="0.2.0")

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Provider defaults
PROVIDER_BASE_URLS = {
    "openrouter": "https://openrouter.ai/api/v1",
    "ollama": "http://host.docker.internal:11434/v1",
}


class Settings(BaseModel):
    llmProvider: str = "openrouter"
    apiKey: Optional[str] = ""
    baseUrl: Optional[str] = ""
    modelName: str = "meta-llama/llama-3-8b-instruct:free"


class ChatRequest(BaseModel):
    messages: list[dict]
    context: Optional[dict] = None
    settings: Optional[Settings] = None


async def stream_llm_response(client: AsyncOpenAI, model: str, messages: list[dict]) -> AsyncGenerator[str, None]:
    """Stream LLM response as SSE chunks."""
    try:
        stream = await client.chat.completions.create(
            model=model,
            messages=messages,
            stream=True
        )
        
        async for chunk in stream:
            content = chunk.choices[0].delta.content if chunk.choices else None
            if content:
                yield f"data: {json.dumps({'content': content})}\n\n"
    except Exception as e:
        yield f"data: {json.dumps({'error': str(e)})}\n\n"
    
    yield "data: [DONE]\n\n"


@app.get("/health")
async def health_check():
    """Health check endpoint for Docker container verification."""
    return {"status": "ok"}


@app.get("/")
async def root():
    """Root endpoint."""
    return {"message": "AI Avatar Backend API", "version": "0.2.0"}


@app.post("/api/chat")
async def chat(request: ChatRequest):
    """
    Chat endpoint with streaming support.
    
    Stateless Proxy Pattern:
    - Settings from request override environment variables
    - Falls back to .env if no apiKey provided
    - Supports OpenRouter, Ollama, and other OpenAI-compatible APIs
    """
    # Extract settings with defaults
    settings = request.settings or Settings()
    provider = settings.llmProvider
    model = settings.modelName
    
    # Resolve API key: request > env fallback
    api_key = settings.apiKey or os.getenv("OPENROUTER_API_KEY", "")
    
    # Resolve base URL: request > provider default
    if settings.baseUrl:
        base_url = settings.baseUrl
    else:
        base_url = PROVIDER_BASE_URLS.get(provider, PROVIDER_BASE_URLS["openrouter"])
    
    # Initialize async OpenAI client
    client = AsyncOpenAI(api_key=api_key, base_url=base_url)
    
    # Prepare messages with context
    messages = request.messages
    if request.context:
        # Add system message with user context if available
        context_parts = []
        if request.context.get("userName"):
            context_parts.append(f"User's name: {request.context['userName']}")
        if request.context.get("language"):
            context_parts.append(f"Language: {request.context['language']}")
        if request.context.get("aboutMe"):
            context_parts.append(f"About user: {request.context['aboutMe']}")
        
        if context_parts:
            system_message = {
                "role": "system",
                "content": "You are a helpful AI Avatar assistant. " + ", ".join(context_parts)
            }
            messages = [system_message] + list(messages)
    
    # Return streaming response
    return StreamingResponse(
        stream_llm_response(client, model, messages),
        media_type="text/event-stream"
    )
