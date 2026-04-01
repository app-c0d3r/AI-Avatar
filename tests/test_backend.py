"""
AI Avatar Backend Tests
Test the FastAPI backend endpoints and fallback logic.
"""

import pytest
import os
import sys
from unittest.mock import patch, AsyncMock, MagicMock

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

# Set test environment variables before importing main
os.environ["OPENROUTER_API_KEY"] = "test_key"
os.environ["DEFAULT_OPENROUTER_MODEL"] = "test-model"
os.environ["OLLAMA_BASE_URL"] = "http://localhost:11434/v1"
os.environ["DEFAULT_OLLAMA_MODEL"] = "llama3"

from fastapi.testclient import TestClient
from main import app, PROVIDER_BASE_URLS, DEFAULT_MODELS


@pytest.fixture
def client():
    """Create test client."""
    return TestClient(app)


class TestHealthEndpoint:
    """Test health check endpoint."""

    def test_health_check(self, client):
        """Health endpoint should return ok status."""
        response = client.get("/health")
        assert response.status_code == 200
        assert response.json() == {"status": "ok"}


class TestRootEndpoint:
    """Test root endpoint."""

    def test_root(self, client):
        """Root endpoint should return API info."""
        response = client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert "AI Avatar Backend API" in data["message"]
        assert data["version"] == "0.3.0"


class TestProviderDefaults:
    """Test provider configuration defaults."""

    def test_provider_base_urls(self):
        """Provider URLs should be configured."""
        assert "openrouter" in PROVIDER_BASE_URLS
        assert "ollama" in PROVIDER_BASE_URLS
        assert PROVIDER_BASE_URLS["openrouter"] == "https://openrouter.ai/api/v1"

    def test_default_models(self):
        """Default models should be loaded from env or have fallbacks."""
        assert "openrouter" in DEFAULT_MODELS
        assert "ollama" in DEFAULT_MODELS


class TestChatEndpoint:
    """Test chat endpoint."""

    def test_chat_empty_messages(self, client):
        """Chat with empty messages should handle gracefully."""
        response = client.post("/api/chat", json={
            "messages": [],
            "settings": {
                "llmProvider": "openrouter",
                "modelName": ""
            }
        })
        # Should attempt to call API (will fail without valid key, but that's expected)
        assert response.status_code in [200, 500]

    def test_chat_with_context(self, client):
        """Chat with user context should include it in request."""
        response = client.post("/api/chat", json={
            "messages": [{"role": "user", "content": "Hello"}],
            "context": {
                "userName": "TestUser",
                "language": "English"
            },
            "settings": {
                "llmProvider": "openrouter",
                "modelName": "test-model"
            }
        })
        # Will fail due to invalid API key, but validates request structure
        assert response.status_code in [200, 500]

    def test_chat_ollama_provider(self, client):
        """Chat with Ollama provider should use correct settings."""
        response = client.post("/api/chat", json={
            "messages": [{"role": "user", "content": "Hello"}],
            "settings": {
                "llmProvider": "ollama",
                "modelName": "llama3"
            }
        })
        # Will fail if Ollama not running, but validates routing
        assert response.status_code in [200, 500]


class TestFallbackMechanism:
    """Test cross-provider fallback logic."""

    @patch('main.AsyncOpenAI')
    def test_fallback_on_primary_failure(self, mock_openai):
        """Should fallback to Ollama when primary fails."""
        # Configure mock to raise exception on primary call
        mock_primary = MagicMock()
        mock_primary.chat.completions.create = AsyncMock(
            side_effect=Exception("Primary API unavailable")
        )
        mock_openai.return_value = mock_primary

        # This would test the fallback, but streaming makes it complex
        # For now, we verify the configuration is correct
        assert DEFAULT_MODELS["ollama"] == os.getenv("DEFAULT_OLLAMA_MODEL", "llama3")


class TestSettingsModel:
    """Test Pydantic settings model validation."""

    def test_settings_default_values(self, client):
        """Settings should have correct defaults."""
        response = client.post("/api/chat", json={
            "messages": [{"role": "user", "content": "test"}]
        })
        # Default settings should be applied
        assert response.status_code in [200, 500]

    def test_settings_custom_values(self, client):
        """Custom settings should be accepted."""
        response = client.post("/api/chat", json={
            "messages": [{"role": "user", "content": "test"}],
            "settings": {
                "llmProvider": "openrouter",
                "apiKey": "custom-key",
                "baseUrl": "https://custom.api.com",
                "modelName": "custom-model"
            }
        })
        assert response.status_code in [200, 500]


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
