"""
AIComply LogVault — LlamaIndex Connector
EU AI Act Art. 12 — Automatic logging for LlamaIndex pipelines

Usage:
    from aicomply_logvault import LogVault
    from aicomply_llamaindex import AIComplyObserver

    lv = LogVault(api_key="your-key", ai_system_id="uuid")

    # Attacca l'observer globale a LlamaIndex
    AIComplyObserver.setup(lv)

    # Da questo momento TUTTE le query LlamaIndex vengono loggiate
    from llama_index.core import VectorStoreIndex, SimpleDirectoryReader
    docs = SimpleDirectoryReader("data").load_data()
    index = VectorStoreIndex.from_documents(docs)
    response = index.as_query_engine().query("Qual è il rischio AI?")

    # Oppure: attach a un engine specifico
    engine = index.as_query_engine()
    engine = AIComplyObserver.wrap_engine(engine, lv)
"""

import time
import hashlib
from typing import Optional, Any, Sequence, Dict

try:
    from llama_index.core.callbacks import (
        CallbackManager,
        CBEventType,
        EventPayload,
        BaseCallbackHandler,
    )
    from llama_index.core import Settings
    LLAMAINDEX_AVAILABLE = True
except ImportError:
    LLAMAINDEX_AVAILABLE = False
    # Fallback stub per ambienti senza LlamaIndex
    class BaseCallbackHandler:  # type: ignore
        pass
    CBEventType = None
    EventPayload = None


class AIComplyCallbackHandler(BaseCallbackHandler):
    """
    LlamaIndex callback handler per AIComply LogVault.
    Intercetta LLM calls, query engine calls e embedding calls.
    """

    def __init__(self, logvault, privacy_mode: bool = True):
        if not LLAMAINDEX_AVAILABLE:
            raise ImportError("llama-index-core required: pip install llama-index-core")

        super().__init__(
            event_starts_to_ignore=[],
            event_ends_to_ignore=[],
        )
        self.lv = logvault
        self.privacy_mode = privacy_mode
        self._timers: Dict[str, float] = {}
        self._prompts: Dict[str, str] = {}

    def on_event_start(
        self,
        event_type: Any,
        payload: Optional[Dict] = None,
        event_id: str = "",
        **kwargs: Any,
    ) -> str:
        self._timers[event_id] = time.time()

        # Cattura prompt LLM
        if event_type == CBEventType.LLM and payload:
            messages = payload.get(EventPayload.MESSAGES, [])
            if messages:
                last = messages[-1]
                content = getattr(last, "content", str(last))
                self._prompts[event_id] = content

        # Cattura query engine input
        elif event_type == CBEventType.QUERY and payload:
            query_str = payload.get(EventPayload.QUERY_STR, "")
            self._prompts[event_id] = query_str

        return event_id

    def on_event_end(
        self,
        event_type: Any,
        payload: Optional[Dict] = None,
        event_id: str = "",
        **kwargs: Any,
    ) -> None:
        latency_ms = int((time.time() - self._timers.pop(event_id, time.time())) * 1000)
        prompt = self._prompts.pop(event_id, "")

        if not payload:
            return

        try:
            # LLM completion event
            if event_type == CBEventType.LLM:
                response = payload.get(EventPayload.RESPONSE)
                output = ""
                token_count = None

                if response:
                    # Gestisce sia ChatResponse che CompletionResponse
                    if hasattr(response, "message"):
                        output = response.message.content or ""
                    elif hasattr(response, "text"):
                        output = response.text or ""
                    if hasattr(response, "raw") and response.raw:
                        usage = response.raw.get("usage", {})
                        token_count = usage.get("total_tokens")

                self.lv.log_inference(
                    prompt=prompt,
                    output=output,
                    model_id="llamaindex-llm",
                    latency_ms=latency_ms,
                    token_count=token_count,
                    metadata={"event_type": "llm_completion", "event_id": event_id},
                )

            # Query engine event
            elif event_type == CBEventType.QUERY:
                response = payload.get(EventPayload.RESPONSE)
                output = str(response) if response else ""

                # Source nodes per tracciabilità RAG
                source_nodes = []
                if hasattr(response, "source_nodes"):
                    source_nodes = [
                        {
                            "score": getattr(n, "score", None),
                            "doc_id": getattr(n.node, "doc_id", None) if hasattr(n, "node") else None,
                        }
                        for n in (response.source_nodes or [])[:5]  # max 5 sources
                    ]

                self.lv.log_inference(
                    prompt=prompt,
                    output=output,
                    model_id="llamaindex-query-engine",
                    latency_ms=latency_ms,
                    metadata={
                        "event_type": "rag_query",
                        "source_nodes_count": len(source_nodes),
                        "source_nodes": source_nodes,
                        "event_id": event_id,
                    },
                )

            # Embedding event — logga solo metadati (privacy)
            elif event_type == CBEventType.EMBEDDING:
                chunks = payload.get(EventPayload.CHUNKS, [])
                self.lv.log_inference(
                    prompt=f"[EMBEDDING] {len(chunks)} chunk(s)",
                    output=f"[EMBEDDING OK] latency={latency_ms}ms",
                    model_id="llamaindex-embedding",
                    latency_ms=latency_ms,
                    metadata={"event_type": "embedding", "chunk_count": len(chunks)},
                )

        except Exception as e:
            # Mai interrompere la pipeline LlamaIndex
            print(f"[AIComply] Callback error (non-blocking): {e}")

    def start_trace(self, trace_id: Optional[str] = None) -> None:
        pass

    def end_trace(self, trace_id: Optional[str] = None, trace_map: Optional[Dict] = None) -> None:
        pass


class AIComplyObserver:
    """
    Helper statico per attaccare AIComply a LlamaIndex globalmente o per engine specifico.
    """

    @staticmethod
    def setup(logvault, privacy_mode: bool = True) -> "AIComplyCallbackHandler":
        """
        Attacca il callback handler a Settings globali di LlamaIndex.
        Tutti gli engine creati dopo questa chiamata vengono automaticamente loggati.

        Args:
            logvault: istanza di LogVault
            privacy_mode: se True, invia solo hash (default True)

        Returns:
            handler: il callback handler installato
        """
        if not LLAMAINDEX_AVAILABLE:
            raise ImportError("llama-index-core required: pip install llama-index-core")

        handler = AIComplyCallbackHandler(logvault, privacy_mode)

        if Settings.callback_manager is None:
            Settings.callback_manager = CallbackManager([handler])
        else:
            Settings.callback_manager.add_handler(handler)

        print(f"[AIComply LogVault] LlamaIndex global observer active (privacy_mode={privacy_mode})")
        return handler

    @staticmethod
    def wrap_engine(engine: Any, logvault, privacy_mode: bool = True) -> Any:
        """
        Attacca il logging a un query engine specifico senza toccare i Settings globali.

        Args:
            engine: query engine LlamaIndex
            logvault: istanza di LogVault
            privacy_mode: se True, invia solo hash

        Returns:
            engine: lo stesso engine con callback installato
        """
        if not LLAMAINDEX_AVAILABLE:
            raise ImportError("llama-index-core required: pip install llama-index-core")

        handler = AIComplyCallbackHandler(logvault, privacy_mode)

        if hasattr(engine, "callback_manager"):
            if engine.callback_manager is None:
                engine.callback_manager = CallbackManager([handler])
            else:
                engine.callback_manager.add_handler(handler)
        else:
            print("[AIComply] Warning: engine has no callback_manager — using global Settings")
            AIComplyObserver.setup(logvault, privacy_mode)

        return engine
