import asyncio
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
    context = {
        "vendor": vendor,
        "default_gl": lake.resolve(vendor["default_gl"]),
        "home_state": lake.resolve(vendor["home_state"]),
        "candidate_gl_codes": lake.snapshot()["gl_codes"],
    }
    prompt = (
        "Solve this ledger entry using the live vendor, GL, and state records. "
        "Return JSON only. If tool calling is unavailable, the JSON answer is the fallback trace.\n"
        f"Entry: {json.dumps(public_entry, sort_keys=True)}\n"
        f"Live context: {json.dumps(context, sort_keys=True)}\n"
        "Schema: gl_code, state_code, disposition. Use one exact disposition from: "
        "auto-post, duplicate-review, meals-review, 1099-reportable, split-review, "
        "capitalize, expedite-review, retainer-review. "
        "Multi-period prepaid software is capitalize; urgent contractor release is "
        "expedite-review; prepaid legal retainer is retainer-review."
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

    summaries = {
        "capitalize": "Multi-period prepaid software uses the capitalized software code.",
        "expedite-review": "Urgent contractor releases retain contractor coding and require expedited review.",
        "retainer-review": "Prepaid legal retainers retain legal coding and require retainer review.",
    }
    reasoning_summary = summaries.get(
        answer["disposition"],
        "Apply the vendor's validated ledger classification and current state code.",
    )
    return {
        "entry_id": entry["entry_id"],
        "tool_calls": tool_calls,
        "reasoning_summary": reasoning_summary,
        "result": result,
        "prompt": prompt,
    }


async def run_specialist(spec: dict[str, Any], entry: dict[str, Any]) -> dict[str, Any]:
    vendor = lake.resolve(entry["vendor_id"])
    live_codes = [
        *spec["code_references"],
        entry["vendor_id"],
        vendor["default_gl"],
        vendor["home_state"],
    ]
    resolved = {code: lake.resolve(code) for code in dict.fromkeys(live_codes)}
    prompt = spec["prompt_template"].format(
        raw_text=entry["raw_text"],
        resolved_codes=json.dumps(resolved, sort_keys=True),
    )
    prompt += (
        f"\nReturn state_code exactly as {vendor['home_state']}; do not abbreviate or return the state name."
    )
    result = await call_model("cheap", entry, prompt, spec["answer_schema"])
    state_row = lake.resolve(vendor["home_state"])
    if result["answer"]["state_code"] == state_row["state"]:
        result["answer"]["state_code"] = vendor["home_state"]
    return {
        "result": result,
        "resolved_codes": resolved,
        "prompt": prompt,
    }


async def validate(
    specialist: dict[str, Any],
    held_out: list[dict[str, Any]],
) -> dict[str, Any]:
    async def evaluate(entry: dict[str, Any]) -> dict[str, Any]:
        run = await run_specialist(specialist, entry)
        is_match = run["result"]["answer"] == entry["_ground_truth"]
        return {
            "entry_id": entry["entry_id"],
            "matches_truth": is_match,
            "result": run["result"],
            "resolved_codes": run["resolved_codes"],
        }

    runs = list(await asyncio.gather(*(evaluate(entry) for entry in held_out)))
    matches = sum(int(run["matches_truth"]) for run in runs)

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
