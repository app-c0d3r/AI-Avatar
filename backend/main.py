import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(title="MAPA Backend", version="0.1.0")

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatRequest(BaseModel):
    messages: list[dict]
    context: dict | None = None


@app.get("/health")
async def health_check():
    """Health check endpoint for Docker container verification."""
    return {"status": "ok"}


@app.get("/")
async def root():
    """Root endpoint."""
    return {"message": "MAPA Backend API", "version": "0.1.0"}


@app.post("/api/chat")
async def chat(request: ChatRequest):
    """
    Chat endpoint - receives message history and returns AI response.
    
    Currently returns a static response for testing frontend-backend connection.
    OpenRouter integration to be implemented.
    """
    # Get the last user message
    last_message = request.messages[-1] if request.messages else {"content": ""}
    
    # Static response for Phase 03 testing
    response_text = (
        f"Received your message: \"{last_message['content']}\"\n\n"
        f"Backend connection successful! "
        f"OpenRouter integration coming soon."
    )
    
    if request.context and request.context.get("userName"):
        response_text = f"Hello {request.context['userName']}! " + response_text

    return {
        "response": response_text,
        "model": "echo-bot"
    }
