"""
AIComply LogVault SDK — Python
EU AI Act Art. 12 — Automatic logging for high-risk AI systems

Usage:
    from aicomply_logvault import LogVault

    lv = LogVault(api_key="your-key", ai_system_id="uuid")

    # Manual logging
    lv.log_inference(
        prompt="Analizza questo CV",
        output="Score: 87/100",
        model_id="gpt-4o",
        latency_ms=320
    )

    # OpenAI auto-interceptor
    import openai
    lv.patch_openai(openai)

    # LangChain callback
    from langchain.callbacks import CallbackManager
    manager = CallbackManager([lv.langchain_callback()])
"""

import hashlib
import json
import time
import threading
import requests
from datetime import datetime
from typing import Optional, Dict, Any, List
from queue import Queue, Empty


AICOMPLY_ENDPOINT = "https://aicomply-omega.vercel.app/api/logvault/ingest"
SDK_VERSION = "1.0.0"


class LogVault:
    """
    AIComply LogVault — Art. 12 EU AI Act compliance logger.
    Thread-safe, async-friendly, with automatic batch flushing.
    """

    def __init__(
        self,
        api_key: str,
        ai_system_id: Optional[str] = None,
        endpoint: str = AICOMPLY_ENDPOINT,
        batch_size: int = 10,
        flush_interval: float = 5.0,
        privacy_mode: bool = True,   # Se True, invia solo hash (mai testo in chiaro)
        enabled: bool = True,
    ):
        self.api_key = api_key
        self.ai_system_id = ai_system_id
        self.endpoint = endpoint
        self.batch_size = batch_size
        self.flush_interval = flush_interval
        self.privacy_mode = privacy_mode
        self.enabled = enabled

        self._queue: Queue = Queue()
        self._lock = threading.Lock()
        self._session = requests.Session()
        self._session.headers.update({
            "X-AIComply-Key": api_key,
            "X-AIComply-SDK-Version": SDK_VERSION,
            "Content-Type": "application/json",
        })

        # Avvia flush thread in background
        if enabled:
            self._flush_thread = threading.Thread(
                target=self._flush_loop,
                daemon=True,
                name="aicomply-logvault-flush"
            )
            self._flush_thread.start()

    # ─── Core logging ──────────────────────────────────────────────────────────

    def log_inference(
        self,
        prompt: str,
        output: str,
        model_id: str = "unknown",
        model_version: Optional[str] = None,
        latency_ms: Optional[int] = None,
        token_count: Optional[int] = None,
        within_guardrails: bool = True,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> None:
        """Logga un evento di inferenza AI."""
        if not self.enabled:
            return

        event = {
            "event_type": "inference",
            "model_id": model_id,
            "model_version": model_version,
            "latency_ms": latency_ms,
            "token_count": token_count,
            "within_guardrails": within_guardrails,
            "metadata": metadata or {},
        }

        if self.privacy_mode:
            # Invia solo hash SHA-256 — mai testo in chiaro
            event["prompt_hash"] = self._hash(prompt)
            event["output_hash"] = self._hash(output)
        else:
            event["prompt"] = prompt
            event["output"] = output
            event["prompt_hash"] = self._hash(prompt)
            event["output_hash"] = self._hash(output)

        if self.ai_system_id:
            event["ai_system_id"] = self.ai_system_id

        self._queue.put(event)

    def log_alert(
        self,
        reason: str,
        severity: str = "warning",
        metadata: Optional[Dict[str, Any]] = None,
    ) -> None:
        """Logga un alert di compliance."""
        if not self.enabled:
            return

        event = {
            "event_type": "alert",
            "flagged": True,
            "flag_reason": reason,
            "flag_severity": severity,
            "within_guardrails": False,
            "metadata": metadata or {},
        }
        if self.ai_system_id:
            event["ai_system_id"] = self.ai_system_id

        self._queue.put(event)

    def log_drift(
        self,
        metric: str,
        current_value: float,
        baseline_value: float,
        threshold: float,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> None:
        """Logga un evento di data/model drift."""
        if not self.enabled:
            return

        deviation_pct = abs(current_value - baseline_value) / max(abs(baseline_value), 1e-9) * 100
        event = {
            "event_type": "drift",
            "flagged": deviation_pct > threshold,
            "flag_reason": f"Drift detected: {metric} = {current_value:.3f} (baseline: {baseline_value:.3f}, deviation: {deviation_pct:.1f}%)",
            "flag_severity": "critical" if deviation_pct > threshold * 2 else "warning",
            "within_guardrails": deviation_pct <= threshold,
            "metadata": {
                **(metadata or {}),
                "metric": metric,
                "current": current_value,
                "baseline": baseline_value,
                "threshold": threshold,
                "deviation_pct": round(deviation_pct, 2),
            },
        }
        if self.ai_system_id:
            event["ai_system_id"] = self.ai_system_id

        self._queue.put(event)

    # ─── OpenAI interceptor ────────────────────────────────────────────────────

    def patch_openai(self, openai_module) -> None:
        """
        Intercetta automaticamente le chiamate OpenAI.

        Uso:
            import openai
            lv.patch_openai(openai)
            # Da questo momento tutte le chat.completions.create vengono loggati
        """
        original_create = openai_module.chat.completions.create
        lv = self

        def patched_create(*args, **kwargs):
            start = time.time()
            response = original_create(*args, **kwargs)
            latency = int((time.time() - start) * 1000)

            try:
                messages = kwargs.get("messages", [])
                prompt = messages[-1].get("content", "") if messages else ""
                output = response.choices[0].message.content if response.choices else ""
                usage = response.usage
                lv.log_inference(
                    prompt=prompt,
                    output=output,
                    model_id=kwargs.get("model", "openai-unknown"),
                    latency_ms=latency,
                    token_count=usage.total_tokens if usage else None,
                    metadata={"openai_id": response.id},
                )
            except Exception:
                pass  # Non interrompere mai il flusso principale

            return response

        openai_module.chat.completions.create = patched_create
        print(f"[AIComply LogVault] OpenAI interceptor active (privacy_mode={self.privacy_mode})")

    # ─── LangChain callback ────────────────────────────────────────────────────

    def langchain_callback(self):
        """
        Restituisce un LangChain BaseCallbackHandler per logging automatico.

        Uso:
            from langchain_core.callbacks import CallbackManager
            chain = MyChain(callbacks=[lv.langchain_callback()])
        """
        try:
            from langchain_core.callbacks import BaseCallbackHandler

            lv = self

            class AIComplyCallback(BaseCallbackHandler):
                def on_llm_start(self, serialized, prompts, **kwargs):
                    self._start_time = time.time()
                    self._prompts = prompts

                def on_llm_end(self, response, **kwargs):
                    latency = int((time.time() - getattr(self, "_start_time", time.time())) * 1000)
                    prompt = self._prompts[0] if getattr(self, "_prompts", []) else ""
                    output = response.generations[0][0].text if response.generations else ""
                    lv.log_inference(
                        prompt=prompt,
                        output=output,
                        model_id="langchain",
                        latency_ms=latency,
                    )

            return AIComplyCallback()
        except ImportError:
            raise ImportError("langchain_core required: pip install langchain-core")

    # ─── Flush logic ───────────────────────────────────────────────────────────

    def flush(self) -> Dict[str, Any]:
        """Forza il flush immediato della coda."""
        events: List[Dict] = []
        try:
            while True:
                events.append(self._queue.get_nowait())
                if len(events) >= self.batch_size:
                    break
        except Empty:
            pass

        if not events:
            return {"logged": 0}

        return self._send_batch(events)

    def _flush_loop(self) -> None:
        while True:
            time.sleep(self.flush_interval)
            self.flush()

    def _send_batch(self, events: List[Dict]) -> Dict[str, Any]:
        try:
            payload = {
                "api_key": self.api_key,
                "events": events,
            }
            resp = self._session.post(
                self.endpoint,
                json=payload,
                timeout=10,
            )
            resp.raise_for_status()
            return resp.json()
        except Exception as e:
            print(f"[AIComply LogVault] Flush error: {e}")
            return {"logged": 0, "error": str(e)}

    @staticmethod
    def _hash(text: str) -> str:
        return hashlib.sha256(text.encode("utf-8")).hexdigest()

    def __enter__(self):
        return self

    def __exit__(self, *args):
        self.flush()


# ─── Decoratori helper ────────────────────────────────────────────────────────

def log_ai_call(lv: LogVault, model_id: str = "unknown"):
    """
    Decoratore per loggare automaticamente funzioni che chiamano AI.

    Uso:
        @log_ai_call(lv, model_id="gpt-4o")
        def mia_funzione_ai(prompt: str) -> str:
            return client.chat.completions.create(...)
    """
    def decorator(func):
        def wrapper(*args, **kwargs):
            start = time.time()
            result = func(*args, **kwargs)
            latency = int((time.time() - start) * 1000)
            prompt = str(args[0]) if args else str(kwargs)
            output = str(result)
            lv.log_inference(
                prompt=prompt,
                output=output,
                model_id=model_id,
                latency_ms=latency,
            )
            return result
        return wrapper
    return decorator
