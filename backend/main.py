import os
import json
import logging
import edge_tts
from typing import Optional, AsyncGenerator
from dotenv import load_dotenv
from pathlib import Path
from fastapi import FastAPI, File, HTTPException, Response, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from openai import AsyncOpenAI

# Load environment variables from .env file
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="AI Avatar Backend", version="0.3.0")

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Persistent upload directories — map to ./backend/uploads on the host via Docker volume mount
UPLOADS_BASE   = Path("/app/uploads")
UPLOADS_MODELS = UPLOADS_BASE / "models"
UPLOADS_MODELS.mkdir(parents=True, exist_ok=True)

app.mount("/uploads", StaticFiles(directory=str(UPLOADS_BASE)), name="uploads")

# Provider defaults
PROVIDER_BASE_URLS = {
    "openrouter": "https://openrouter.ai/api/v1",
    "ollama": os.getenv("OLLAMA_BASE_URL", "http://host.docker.internal:11434"),
}

# Default models from environment
DEFAULT_MODELS = {
    "openrouter": os.getenv("DEFAULT_OPENROUTER_MODEL", "openrouter/free"),
    "ollama": os.getenv("OLLAMA_DEFAULT_MODEL", "llama3.2:latest"),
}


class TTSRequest(BaseModel):
    text: str
    voice: str = "female"
    language: str = "en-US"


class Settings(BaseModel):
    llmProvider: str = "openrouter"
    apiKey: Optional[str] = ""
    baseUrl: Optional[str] = ""
    modelName: Optional[str] = ""


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
    return {"message": "AI Avatar Backend API", "version": "0.3.0"}


async def stream_with_fallback(
    primary_client: AsyncOpenAI,
    primary_model: str,
    messages: list[dict],
    provider: str
) -> AsyncGenerator[str, None]:
    """
    Stream LLM response with automatic fallback to Ollama.
    
    Fallback chain:
    1. Primary provider (OpenRouter or configured)
    2. Local Ollama instance
    """
    fallback_client = None
    
    try:
        # Try primary provider
        stream = await primary_client.chat.completions.create(
            model=primary_model,
            messages=messages,
            stream=True
        )
        
        async for chunk in stream:
            content = chunk.choices[0].delta.content if chunk.choices else None
            if content:
                yield f"data: {json.dumps({'content': content})}\n\n"
        
        yield "data: [DONE]\n\n"
        
    except Exception as primary_error:
        logger.warning(
            f"Primary LLM failed (Provider: {provider}, Error: {primary_error}). "
            f"Falling back to local Ollama."
        )
        
        try:
            # Initialize fallback client for Ollama
            ollama_base_url = os.getenv("OLLAMA_BASE_URL", "http://host.docker.internal:11434")
            # Ensure /v1 suffix for OpenAI compatibility
            if not ollama_base_url.endswith("/v1"):
                ollama_base_url = ollama_base_url.rstrip('/') + "/v1"
            
            fallback_client = AsyncOpenAI(
                base_url=ollama_base_url,
                api_key="ollama"
            )
            
            fallback_model = os.getenv("OLLAMA_DEFAULT_MODEL", "llama3.2:latest")
            
            stream = await fallback_client.chat.completions.create(
                model=fallback_model,
                messages=messages,
                stream=True
            )
            
            async for chunk in stream:
                content = chunk.choices[0].delta.content if chunk.choices else None
                if content:
                    yield f"data: {json.dumps({'content': content})}\n\n"
            
            yield "data: [DONE]\n\n"
            
        except Exception as fallback_error:
            logger.error(
                f"All LLM providers failed. "
                f"Primary ({provider}): {primary_error}, "
                f"Fallback (Ollama): {fallback_error}"
            )
            # Yield error as SSE message for frontend to display
            yield f"data: {json.dumps({'error': f'Service unavailable: {str(fallback_error)}'})}\n\n"
            yield "data: [DONE]\n\n"


@app.post("/api/chat")
async def chat(request: ChatRequest):
    """
    Chat endpoint with streaming support and cross-provider fallback.

    Fallback Chain:
    1. Primary: OpenRouter (or requested provider)
    2. Fallback: Local Ollama instance
    """
    # Extract settings with defaults
    settings = request.settings or Settings()
    provider = settings.llmProvider

    # Resolve API key: request > env fallback
    api_key = settings.apiKey or os.getenv("OPENROUTER_API_KEY", "")

    # Resolve base URL: request > provider default
    if settings.baseUrl:
        base_url = settings.baseUrl
    else:
        base_url = PROVIDER_BASE_URLS.get(provider, PROVIDER_BASE_URLS["openrouter"])

    # Resolve model: request > env fallback > hardcoded default
    if settings.modelName:
        model = settings.modelName
    else:
        model = DEFAULT_MODELS.get(provider, DEFAULT_MODELS["openrouter"])

    # Prepare messages with context
    messages = request.messages
    if request.context:
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

    # Initialize primary client
    primary_client = AsyncOpenAI(api_key=api_key, base_url=base_url)

    # Return streaming response with automatic fallback
    return StreamingResponse(
        stream_with_fallback(primary_client, model, messages, provider),
        media_type="text/event-stream"
    )


@app.post("/api/tts")
async def text_to_speech(request: TTSRequest):
    """Generate audio from text using edge-tts and return it as an MPEG stream."""
    try:
        is_german = request.language.startswith("de")
        if request.voice == "male":
            voice_name = "de-DE-ConradNeural" if is_german else "en-US-GuyNeural"
        else:
            voice_name = "de-DE-AmalaNeural" if is_german else "en-US-AriaNeural"

        communicate = edge_tts.Communicate(request.text, voice_name)
        audio_data = b""
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                audio_data += chunk["data"]

        logger.info("TTS request: voice=%s lang=%s text_len=%d", voice_name, request.language, len(request.text))
        return Response(content=audio_data, media_type="audio/mpeg")
    except Exception as e:
        logger.error("TTS error: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/upload/model")
async def upload_model(file: UploadFile = File(...)):
    """Receive a 3D model file and save it to the persistent uploads volume."""
    dest = UPLOADS_MODELS / file.filename
    content = await file.read()
    dest.write_bytes(content)
    url = f"http://localhost:8000/uploads/models/{file.filename}"
    logger.info("3D model uploaded: %s (%d bytes)", file.filename, len(content))
    return {"url": url}
