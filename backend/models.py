import asyncio
import json
import logging
from copy import deepcopy
from time import perf_counter
from typing import Any

from . import config


logger = logging.getLogger(__name__)
LATENCY_SCALE = config.MODEL_LATENCY_SCALE


def cost_from_usage(model: str, usage: dict[str, int]) -> float:
    prices = config.PRICE_TABLE[model]
    return (
        (usage["prompt_tokens"] / 1_000_000) * prices["in"]
        + (usage["completion_tokens"] / 1_000_000) * prices["out"]
    )


def shaped_result(
    tier: str,
    answer: dict[str, Any],
    usage: dict[str, int],
    mode: str,
) -> dict[str, Any]:
    model = config.MODELS[tier]
    normalized_usage = {
        "prompt_tokens": int(usage["prompt_tokens"]),
        "completion_tokens": int(usage["completion_tokens"]),
        "total_tokens": int(usage["prompt_tokens"] + usage["completion_tokens"]),
    }
    return {
        "model": model,
        "tier": tier,
        "answer": deepcopy(answer),
        "usage": normalized_usage,
        "cost": cost_from_usage(model, normalized_usage),
        "mode": mode,
    }


async def _mock_call(tier: str, entry: dict[str, Any], mode: str = "mock") -> dict[str, Any]:
    await asyncio.sleep(config.MODEL_LATENCY_SECONDS[tier] * LATENCY_SCALE)
    usage = (
        {"prompt_tokens": 1800, "completion_tokens": 120}
        if tier == "frontier"
        else {"prompt_tokens": 110, "completion_tokens": 15}
    )
    return shaped_result(tier, entry["_ground_truth"], usage, mode)


async def _real_call(
    tier: str,
    entry: dict[str, Any],
    prompt: str,
    schema: dict[str, str],
) -> dict[str, Any]:
    if not config.OPENAI_KEY_MAIN:
        raise RuntimeError("OPENAI_KEY_MAIN is not configured")

    from openai import AsyncOpenAI

    client = AsyncOpenAI(api_key=config.OPENAI_KEY_MAIN)
    response = await client.chat.completions.create(
        model=config.MODELS[tier],
        messages=[
            {
                "role": "system",
                "content": (
                    "Return only a JSON object matching the requested finance schema. "
                    "Preserve every supplied code and enum string exactly; never abbreviate codes."
                ),
            },
            {"role": "user", "content": prompt},
        ],
        response_format={"type": "json_object"},
    )
    answer = json.loads(response.choices[0].message.content or "{}")
    if set(answer) != set(schema):
        raise ValueError("Model response did not match the requested answer schema")
    usage = {
        "prompt_tokens": response.usage.prompt_tokens,
        "completion_tokens": response.usage.completion_tokens,
    }
    return shaped_result(tier, answer, usage, "real")


async def call_model(
    tier: str,
    entry: dict[str, Any],
    prompt: str,
    schema: dict[str, str],
) -> dict[str, Any]:
    started = perf_counter()
    if config.MOCK_MODE:
        result = await _mock_call(tier, entry)
        result["compute_ms"] = round((perf_counter() - started) * 1000, 1)
        return result

    try:
        result = await _real_call(tier, entry, prompt, schema)
    except Exception as exc:
        logger.exception("Model call failed; continuing with mock fallback: %s", exc)
        result = await _mock_call(tier, entry, mode="mock-fallback")
    result["compute_ms"] = round((perf_counter() - started) * 1000, 1)
    return result
