"""
LLM Connection Test Script
Test connectivity to OpenRouter and Ollama providers.

Run inside Docker container:
  docker compose exec backend python tests/test_llm_connections.py
"""

import os
import asyncio
from dotenv import load_dotenv
from openai import AsyncOpenAI

# Load environment variables from .env file
load_dotenv()


async def test_openrouter():
    """Test connection to OpenRouter API."""
    print("\n" + "=" * 60)
    print("Testing OpenRouter Connection")
    print("=" * 60)
    
    api_key = os.getenv("OPENROUTER_API_KEY", "")
    base_url = "https://openrouter.ai/api/v1"
    model = os.getenv("DEFAULT_OPENROUTER_MODEL", "openrouter/free")
    
    print(f"API Key: {'***' + api_key[-4:] if api_key else 'NOT SET'}")
    print(f"Base URL: {base_url}")
    print(f"Model: {model}")
    print()
    
    if not api_key:
        print("❌ ERROR: OPENROUTER_API_KEY is not set in .env")
        return False
    
    try:
        client = AsyncOpenAI(api_key=api_key, base_url=base_url)
        
        response = await client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": "Hello"}],
            max_tokens=10
        )
        
        content = response.choices[0].message.content
        print(f"✅ SUCCESS: OpenRouter responded!")
        print(f"   Response: {content[:100]}...")
        return True
        
    except Exception as e:
        print(f"❌ FAILED: OpenRouter connection failed")
        print(f"   Error Type: {type(e).__name__}")
        print(f"   Error: {str(e)}")
        return False


async def test_ollama():
    """Test connection to local Ollama instance."""
    print("\n" + "=" * 60)
    print("Testing Ollama Connection")
    print("=" * 60)
    
    base_url_raw = os.getenv("OLLAMA_BASE_URL", "http://host.docker.internal:11434")
    # Ensure /v1 suffix for OpenAI compatibility
    base_url = base_url_raw.rstrip('/') + "/v1" if not base_url_raw.endswith("/v1") else base_url_raw
    model = os.getenv("OLLAMA_DEFAULT_MODEL", "llama3.2:latest")
    api_key = "ollama"  # Dummy key for Ollama
    
    print(f"Base URL (raw): {base_url_raw}")
    print(f"Base URL (final): {base_url}")
    print(f"Model: {model}")
    print()
    
    try:
        client = AsyncOpenAI(api_key=api_key, base_url=base_url)
        
        response = await client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": "Hello"}],
            max_tokens=10
        )
        
        content = response.choices[0].message.content
        print(f"✅ SUCCESS: Ollama responded!")
        print(f"   Response: {content[:100]}...")
        return True
        
    except Exception as e:
        print(f"❌ FAILED: Ollama connection failed")
        print(f"   Error Type: {type(e).__name__}")
        print(f"   Error: {str(e)}")
        return False


async def main():
    """Run all connection tests."""
    print("\n" + "=" * 60)
    print("AI Avatar - LLM Connection Tests")
    print("=" * 60)
    
    # Test OpenRouter
    openrouter_ok = await test_openrouter()
    
    # Test Ollama
    ollama_ok = await test_ollama()
    
    # Summary
    print("\n" + "=" * 60)
    print("Summary")
    print("=" * 60)
    print(f"OpenRouter: {'✅ Working' if openrouter_ok else '❌ Failed'}")
    print(f"Ollama:     {'✅ Working' if ollama_ok else '❌ Failed'}")
    print()
    
    if openrouter_ok or ollama_ok:
        print("At least one LLM provider is available.")
    else:
        print("No LLM providers are available. Check:")
        print("  1. OPENROUTER_API_KEY is set correctly in .env")
        print("  2. Ollama is running locally (if using Ollama)")
        print("  3. Network connectivity from Docker container")
    
    print()


if __name__ == "__main__":
    asyncio.run(main())
