"""
Langfuse tracing service.
Wraps the Langfuse Python SDK to record every LLM call as a trace → generation.

Langfuse can run locally (docker-compose) or in the cloud.
Set LANGFUSE_HOST, LANGFUSE_PUBLIC_KEY, LANGFUSE_SECRET_KEY in .env.
"""

import os
from datetime import datetime, timezone
from dotenv import load_dotenv

load_dotenv()

_ENABLED = bool(os.getenv("LANGFUSE_SECRET_KEY"))

if _ENABLED:
    try:
        from langfuse import Langfuse

        _client = Langfuse(
            public_key=os.getenv("LANGFUSE_PUBLIC_KEY", ""),
            secret_key=os.getenv("LANGFUSE_SECRET_KEY", ""),
            host=os.getenv("LANGFUSE_HOST", "https://cloud.langfuse.com"),
        )
    except Exception as exc:
        print(f"[Langfuse] init failed: {exc}")
        _ENABLED = False
        _client = None
else:
    _client = None


class LangfuseService:
    """Thin wrapper so the rest of the app never needs to import langfuse directly."""

    def enabled(self) -> bool:
        return _ENABLED and _client is not None

    def trace_chat(
        self,
        *,
        session_id: str,
        user_id: str | None,
        model: str,
        messages: list[dict],
        response_text: str,
        prompt_tokens: int,
        completion_tokens: int,
        latency_ms: float,
        metadata: dict | None = None,
    ) -> str | None:
        """
        Create a Langfuse trace + generation and return the trace_id.
        Returns None if Langfuse is not configured.
        """
        if not self.enabled():
            return None

        try:
            trace = _client.trace(
                name="chat",
                session_id=session_id,
                user_id=user_id,
                metadata=metadata or {},
                tags=["chainofthought"],
            )

            trace.generation(
                name="ollama-chat",
                model=model,
                model_parameters={"stream": False},
                input=messages,
                output=response_text,
                usage={
                    "input": prompt_tokens,
                    "output": completion_tokens,
                    "unit": "TOKENS",
                },
                start_time=datetime.now(timezone.utc),
                metadata={"latency_ms": latency_ms},
            )

            _client.flush()
            return trace.id
        except Exception as exc:
            print(f"[Langfuse] trace_chat error: {exc}")
            return None

    def score(self, trace_id: str, name: str, value: float, comment: str = "") -> None:
        """Attach a score (e.g. risk_score) to a trace."""
        if not self.enabled() or not trace_id:
            return
        try:
            _client.score(
                trace_id=trace_id,
                name=name,
                value=value,
                comment=comment,
            )
            _client.flush()
        except Exception as exc:
            print(f"[Langfuse] score error: {exc}")


langfuse_svc = LangfuseService()
