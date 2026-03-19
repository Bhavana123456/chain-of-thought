from __future__ import annotations
from typing import Optional, Dict, List, AsyncGenerator
"""Ollama API client — wraps the local Ollama REST server."""

import os
import time
import json
import httpx
from dotenv import load_dotenv

load_dotenv()

OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_TIMEOUT  = float(os.getenv("OLLAMA_TIMEOUT", "120"))

# ── Groq cloud fallback (used when GROQ_API_KEY is set) ───────────────────────
GROQ_API_KEY  = os.getenv("GROQ_API_KEY", "")
GROQ_BASE_URL = "https://api.groq.com/openai/v1"
# Map Ollama model names → Groq model names
GROQ_MODEL_MAP = {
    "llama3.2":         "llama-3.1-8b-instant",
    "llama3.2:latest":  "llama-3.1-8b-instant",
    "llama3":           "llama3-8b-8192",
    "llama3:latest":    "llama3-8b-8192",
    "mistral":          "mixtral-8x7b-32768",
    "mistral:latest":   "mixtral-8x7b-32768",
}


class OllamaService:
    def __init__(self):
        self.base_url = OLLAMA_BASE_URL
        self.client = httpx.AsyncClient(
            base_url=self.base_url,
            timeout=httpx.Timeout(OLLAMA_TIMEOUT),
        )

    async def list_models(self) -> List[Dict]:
        """Return all models pulled into Ollama."""
        try:
            resp = await self.client.get("/api/tags")
            resp.raise_for_status()
            data = resp.json()
            models = []
            for m in data.get("models", []):
                size_bytes = m.get("size", 0)
                models.append({
                    "name": m["name"],
                    "size_gb": round(size_bytes / 1e9, 2),
                    "modified_at": m.get("modified_at"),
                })
            return models
        except Exception as exc:
            print(f"[Ollama] list_models error: {exc}")
            return []

    async def chat(
        self,
        model: str,
        messages: List[Dict],
        options: Optional[Dict] = None,
    ) -> tuple[str, int, int, float]:
        """
        Non-streaming chat. Falls back to Groq if GROQ_API_KEY is set.
        Returns: (response_text, prompt_tokens, completion_tokens, latency_ms)
        """
        if GROQ_API_KEY:
            return await self._groq_chat(model, messages)

        payload = {
            "model": model,
            "messages": messages,
            "stream": False,
            "options": options or {},
        }
        t0 = time.perf_counter()
        resp = await self.client.post("/api/chat", json=payload)
        latency_ms = (time.perf_counter() - t0) * 1000
        resp.raise_for_status()
        data = resp.json()

        response_text = data.get("message", {}).get("content", "")
        usage = data.get("usage", {})
        prompt_tokens = usage.get("prompt_tokens", self._estimate_tokens(messages))
        completion_tokens = usage.get("completion_tokens", self._estimate_tokens_text(response_text))

        return response_text, prompt_tokens, completion_tokens, latency_ms

    async def _groq_chat(
        self,
        model: str,
        messages: List[Dict],
    ) -> tuple[str, int, int, float]:
        """Call Groq's OpenAI-compatible API."""
        groq_model = GROQ_MODEL_MAP.get(model, "llama-3.1-8b-instant")
        headers = {
            "Authorization": f"Bearer {GROQ_API_KEY}",
            "Content-Type": "application/json",
        }
        payload = {"model": groq_model, "messages": messages}
        t0 = time.perf_counter()
        async with httpx.AsyncClient(timeout=60) as client:
            resp = await client.post(
                f"{GROQ_BASE_URL}/chat/completions",
                json=payload,
                headers=headers,
            )
        latency_ms = (time.perf_counter() - t0) * 1000
        resp.raise_for_status()
        data = resp.json()
        response_text = data["choices"][0]["message"]["content"]
        usage = data.get("usage", {})
        return (
            response_text,
            usage.get("prompt_tokens", self._estimate_tokens(messages)),
            usage.get("completion_tokens", self._estimate_tokens_text(response_text)),
            latency_ms,
        )

    async def chat_stream(
        self,
        model: str,
        messages: List[Dict],
        options: Optional[Dict] = None,
    ) -> AsyncGenerator[str, None]:
        """
        Streaming chat — yields text chunks.
        Also returns final usage counts via a special __done__ chunk.
        """
        payload = {
            "model": model,
            "messages": messages,
            "stream": True,
            "options": options or {},
        }
        async with self.client.stream("POST", "/api/chat", json=payload) as resp:
            resp.raise_for_status()
            async for line in resp.aiter_lines():
                if not line:
                    continue
                try:
                    chunk = json.loads(line)
                    content = chunk.get("message", {}).get("content", "")
                    if content:
                        yield content
                    if chunk.get("done"):
                        break
                except json.JSONDecodeError:
                    continue

    async def health(self) -> bool:
        """Return True if Ollama is reachable."""
        try:
            resp = await self.client.get("/api/tags", timeout=5)
            return resp.status_code == 200
        except Exception:
            return False

    @staticmethod
    def _estimate_tokens(messages: List[Dict]) -> int:
        total = sum(len(m.get("content", "").split()) for m in messages)
        return max(1, int(total * 1.3))

    @staticmethod
    def _estimate_tokens_text(text: str) -> int:
        return max(1, int(len(text.split()) * 1.3))


ollama = OllamaService()
