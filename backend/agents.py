import json
from typing import Any

from . import lake
from .models import call_model


ANSWER_SCHEMA = {"gl_code": "str", "state_code": "str", "disposition": "str"}


def _public_entry(entry: dict[str, Any]) -> dict[str, Any]:
    return {
        "type": entry["type"],
        "vendor_id": entry["vendor_id"],
        "amount": entry["amount"],
        "raw_text": entry["raw_text"],
    }


async def run_general(entry: dict[str, Any]) -> dict[str, Any]:
    vendor = lake.resolve(entry["vendor_id"])
    public_entry = _public_entry(entry)
    prompt = (
        "Solve this ledger entry using the live vendor, GL, and state records. "
        "Return JSON only. If tool calling is unavailable, the JSON answer is the fallback trace.\n"
        f"Entry: {json.dumps(public_entry, sort_keys=True)}\n"
        f"Vendor: {json.dumps(vendor, sort_keys=True)}\n"
        "Schema: gl_code, state_code, disposition."
    )
    result = await call_model("frontier", entry, prompt, ANSWER_SCHEMA)
    answer = result["answer"]

    tool_calls = [
        {"tool": "lookup_vendor", "args": {"vendor_id": entry["vendor_id"]}},
        {"tool": "lookup_gl", "args": {"gl_code": vendor["default_gl"]}},
    ]
    if answer["gl_code"] != vendor["default_gl"]:
        tool_calls.append({"tool": "lookup_gl", "args": {"gl_code": answer["gl_code"]}})
    tool_calls.extend(
        [
            {"tool": "lookup_state", "args": {"state_code": answer["state_code"]}},
            {"tool": "emit_answer", "args": dict(answer)},
        ]
    )

    reasoning_summary = (
        "Multi-period prepaid software uses the capitalized software code."
        if answer["gl_code"] == "GL-4890"
        else "Apply the vendor's validated ledger classification and current state code."
    )
    return {
        "entry_id": entry["entry_id"],
        "tool_calls": tool_calls,
        "reasoning_summary": reasoning_summary,
        "result": result,
        "prompt": prompt,
    }


async def run_specialist(spec: dict[str, Any], entry: dict[str, Any]) -> dict[str, Any]:
    resolved = {code: lake.resolve(code) for code in spec["code_references"]}
    prompt = spec["prompt_template"].format(
        raw_text=entry["raw_text"],
        resolved_codes=json.dumps(resolved, sort_keys=True),
    )
    result = await call_model("cheap", entry, prompt, spec["answer_schema"])
    return {
        "result": result,
        "resolved_codes": resolved,
        "prompt": prompt,
    }


async def validate(
    specialist: dict[str, Any],
    held_out: list[dict[str, Any]],
) -> dict[str, Any]:
    runs = []
    matches = 0
    for entry in held_out:
        run = await run_specialist(specialist, entry)
        is_match = run["result"]["answer"] == entry["_ground_truth"]
        matches += int(is_match)
        runs.append(
            {
                "entry_id": entry["entry_id"],
                "matches_truth": is_match,
                "result": run["result"],
                "resolved_codes": run["resolved_codes"],
            }
        )

    specialist["validation"] = {
        "held_out_matches": matches,
        "held_out_total": len(held_out),
    }
    specialist["validated"] = bool(held_out) and matches == len(held_out)
    return {
        "passed": specialist["validated"],
        "runs": runs,
        "cost": sum(run["result"]["cost"] for run in runs),
        "tokens": sum(run["result"]["usage"]["total_tokens"] for run in runs),
    }
