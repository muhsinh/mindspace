# mindspace/clients.py

from openai import OpenAI
from typing import Optional


def make_client(base_url: str, api_key: Optional[str] = None) -> OpenAI:
    """
    Create an OpenAI-compatible client for vLLM or any OpenAI-format server.
    api_key is ignored by vLLM but required by the client, so we use a dummy default.
    """
    return OpenAI(
        base_url=base_url.rstrip("/") + "/v1",
        api_key=api_key or "dummy-key",
    )
