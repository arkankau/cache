import json
import re
from typing import Any

from . import lake


TOOL_TO_TABLE = {
    "lookup_vendor": "vendor_registry",
    "lookup_gl": "gl_codes",
    "lookup_state": "state_codes",
}


def build_template(rule: str, answer_fields: list[str]) -> str:
    fields = ", ".join(answer_fields)
    return (
        "Classify this finance entry.\n"
        "Entry: {raw_text}\n"
        "Resolved codes: {resolved_codes}\n"
        f"Rule: {rule}\n"
        f"Output JSON with fields: {fields}. No reasoning."
    )


def assert_no_resolved_numeric_values(
    prompt_template: str,
    code_references: list[str],
) -> None:
    serialized_refs = json.dumps(code_references, sort_keys=True)
    haystack = f"{prompt_template}\n{serialized_refs}"
    lake_numbers = {float(value) for value in lake.numeric_values()}
    numeric_literals = re.findall(r"(?<![A-Za-z0-9-])\d+(?:\.\d+)?(?![A-Za-z0-9-])", haystack)
    leaked = sorted(
        literal for literal in numeric_literals if float(literal) in lake_numbers
    )
    assert not leaked, f"Resolved lake values leaked into specialist: {', '.join(leaked)}"


def compile_specialist(trace: dict[str, Any], entry: dict[str, Any]) -> dict[str, Any]:
    tool_calls = trace["tool_calls"]
    tables = {
        TOOL_TO_TABLE[call["tool"]]
        for call in tool_calls
        if call["tool"] in TOOL_TO_TABLE
    }

    codes: list[str] = []
    for call in tool_calls:
        if call["tool"] not in TOOL_TO_TABLE:
            continue
        code = next(iter(call["args"].values()))
        lake.resolve(code)
        if code not in codes:
            codes.append(code)

    emit_call = next(call for call in tool_calls if call["tool"] == "emit_answer")
    answer = emit_call["args"]
    answer_schema = {field: type(value).__name__ for field, value in answer.items()}
    prompt_template = build_template(trace["reasoning_summary"], list(answer))
    assert_no_resolved_numeric_values(prompt_template, codes)

    signature = entry["_case_signature"]
    return {
        "specialist_id": f"SPEC-{signature.replace('|', '-')}",
        "case_signature": signature,
        "model_tier": "cheap",
        "retrieval_plan": sorted(tables),
        "code_references": codes,
        "prompt_template": prompt_template,
        "answer_schema": answer_schema,
        "distilled_from": entry["entry_id"],
        "validated": False,
        "validation": {"held_out_matches": 0, "held_out_total": 0},
    }
