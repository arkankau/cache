import os


def _env_bool(name: str, default: bool) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


# Verify names/prices against OpenAI's pricing page the morning of the demo.
# Prices are USD per 1,000,000 tokens.
MODELS = {
    "frontier": "gpt-5.6-sol",
    "cheap": "gpt-4.1-nano",
}
PRICE_TABLE = {
    "gpt-5.6-sol": {"in": 5.00, "out": 30.00},
    "gpt-4.1-nano": {"in": 0.10, "out": 0.40},
}

MATCH_THRESHOLD = 0.0
HELD_OUT_K = 5
POLL_MS = 500

OPENAI_KEY_MAIN = os.getenv("OPENAI_KEY_MAIN", "")
OPENAI_KEY_GEN = os.getenv("OPENAI_KEY_GEN", "")
MOCK_MODE = _env_bool("MOCK_MODE", True)

MODEL_LATENCY_SECONDS = {"frontier": 0.65, "cheap": 0.12}
MODEL_LATENCY_SCALE = float(os.getenv("MODEL_LATENCY_SCALE", "1"))
DEMO_TIME_SCALE = float(os.getenv("DEMO_TIME_SCALE", "1"))

CAPEX_CUES = (
    "annual prepay",
    "prepaid 24 months",
    "yearly contract",
    "paid in full",
    "multi-year",
    "12-month prepaid",
    "12-mo term",
)

RUSH_CUES = ("same-day", "rush", "expedite", "urgent release")
RETAINER_CUES = ("retainer", "prepaid legal", "advance legal")
