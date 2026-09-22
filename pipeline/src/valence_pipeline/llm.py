"""Anthropic client and model configuration (env-overridable)."""

from __future__ import annotations

import os

import anthropic

EXTRACT_MODEL = os.environ.get("VALENCE_EXTRACT_MODEL", "claude-opus-5")
DRAFT_MODEL = os.environ.get("VALENCE_DRAFT_MODEL", "claude-sonnet-5")


def client() -> anthropic.Anthropic:
    # Resolves ANTHROPIC_API_KEY / ANTHROPIC_AUTH_TOKEN / `ant auth login` profile.
    return anthropic.Anthropic()


def strict_schema(model_cls) -> dict:
    """JSON schema for a pydantic model with additionalProperties=false everywhere.

    Used for the Batches API, where we pass output_config.format as a raw schema
    (messages.parse() is not available for batch requests).
    """
    schema = model_cls.model_json_schema()

    def tighten(node):
        if isinstance(node, dict):
            if node.get("type") == "object":
                node.setdefault("additionalProperties", False)
                if "properties" in node:
                    node["required"] = list(node["properties"].keys())
            for v in node.values():
                tighten(v)
        elif isinstance(node, list):
            for v in node:
                tighten(v)

    tighten(schema)
    return schema
