from copy import deepcopy

from .config import MODELS
from .models import cost_from_usage


LAKE_SEED = {
    "vendor_registry": {
        "VEND-0042": {
            "name": "Cloudspan",
            "default_gl": "GL-4021",
            "recon_pattern": "P-04",
            "home_state": "ST-CA-07",
        },
        "VEND-0055": {
            "name": "DeskNest",
            "default_gl": "GL-4021",
            "recon_pattern": "P-04",
            "home_state": "ST-NY-01",
        },
        "VEND-0061": {
            "name": "Relay Comms",
            "default_gl": "GL-4021",
            "recon_pattern": "P-04",
            "home_state": "ST-CA-07",
        },
        "VEND-0088": {
            "name": "Meridian Travel",
            "default_gl": "GL-5510",
            "recon_pattern": "P-11",
            "home_state": "ST-NY-01",
        },
        "VEND-0090": {
            "name": "Beacon Contractors",
            "default_gl": "GL-6200",
            "recon_pattern": "P-22",
            "home_state": "ST-TX-03",
        },
        "VEND-0102": {
            "name": "Ironside Legal",
            "default_gl": "GL-6410",
            "recon_pattern": "P-30",
            "home_state": "ST-NY-01",
        },
    },
    "gl_codes": {
        "GL-4021": {"name": "Software Subscriptions", "rule": "deductible"},
        "GL-5510": {"name": "Travel & Entertainment", "rule": "meals flag"},
        "GL-6200": {"name": "Contractor Services", "rule": "1099-reportable"},
        "GL-6410": {"name": "Legal & Professional", "rule": "deductible"},
        "GL-4890": {"name": "Software - Capitalized", "rule": "prepaid contract"},
    },
    "state_codes": {
        "ST-NY-01": {"state": "NY", "tax_rule": "saas_taxable", "rate": 0.08875},
        "ST-CA-07": {"state": "CA", "tax_rule": "digital_services", "rate": 0.0725},
        "ST-TX-03": {"state": "TX", "tax_rule": "contractor_nexus", "rate": 0.0625},
    },
}


ANSWER_SCHEMA = {"gl_code": "str", "state_code": "str", "disposition": "str"}


def _seed_spec(signature, distilled_from, codes, tables):
    return {
        "specialist_id": f"SPEC-{signature.replace('|', '-')}",
        "case_signature": signature,
        "model_tier": "cheap",
        "retrieval_plan": tables,
        "code_references": codes,
        "prompt_template": (
            "Classify this finance entry.\nEntry: {raw_text}\n"
            "Resolved codes: {resolved_codes}\n"
            "Rule: apply the validated ledger procedure for this case type.\n"
            "Output JSON with fields: gl_code, state_code, disposition. No reasoning."
        ),
        "answer_schema": deepcopy(ANSWER_SCHEMA),
        "distilled_from": distilled_from,
        "validated": True,
        "validation": {"held_out_matches": 5, "held_out_total": 5},
    }


INITIAL_LIBRARY = {
    "invoice|P-04": _seed_spec(
        "invoice|P-04",
        "SEED-001",
        ["VEND-0042", "GL-4021", "ST-CA-07"],
        ["gl_codes", "state_codes", "vendor_registry"],
    ),
    "invoice|P-11": _seed_spec(
        "invoice|P-11",
        "SEED-002",
        ["VEND-0088", "GL-5510", "ST-NY-01"],
        ["gl_codes", "state_codes", "vendor_registry"],
    ),
    "expense|P-22": _seed_spec(
        "expense|P-22",
        "SEED-003",
        ["VEND-0090", "GL-6200", "ST-TX-03"],
        ["gl_codes", "state_codes", "vendor_registry"],
    ),
    "invoice|P-30": _seed_spec(
        "invoice|P-30",
        "SEED-004",
        ["VEND-0102", "GL-6410", "ST-NY-01"],
        ["gl_codes", "state_codes", "vendor_registry"],
    ),
    "notification|dupe": _seed_spec(
        "notification|dupe", "SEED-005", [], []
    ),
    "recon|multistate": _seed_spec(
        "recon|multistate",
        "SEED-006",
        ["GL-4021", "ST-NY-01", "ST-CA-07"],
        ["gl_codes", "state_codes"],
    ),
}


SEED_ROUTE_CHUNKS = (
    (20, 0),
    (19, 1),
    (17, 3),
    (15, 5),
    (11, 9),
    (8, 12),
)
SEED_VENDOR_CYCLE = (
    ("Cloudspan", "invoice|P-04"),
    ("DeskNest", "invoice|P-04"),
    ("Meridian Travel", "invoice|P-11"),
    ("Beacon Contractors", "expense|P-22"),
    ("Ironside Legal", "invoice|P-30"),
    ("Relay Comms", "notification|dupe"),
)
SEED_USAGE = {
    "general": {"prompt_tokens": 1093, "completion_tokens": 440},
    "specialist": {"prompt_tokens": 110, "completion_tokens": 15},
}


def frozen_seed_receipts():
    receipts = []
    index = 0
    for general_count, specialist_count in SEED_ROUTE_CHUNKS:
        for route in ("general",) * general_count + ("specialist",) * specialist_count:
            vendor, signature = SEED_VENDOR_CYCLE[index % len(SEED_VENDOR_CYCLE)]
            usage = deepcopy(SEED_USAGE[route])
            model = MODELS["frontier" if route == "general" else "cheap"]
            receipts.append(
                {
                    "entry_id": f"SEED-{index + 1:03d}",
                    "vendor": vendor,
                    "case_signature": signature,
                    "route": route,
                    "answer": {},
                    "cost": cost_from_usage(model, usage),
                    "tokens": usage["prompt_tokens"] + usage["completion_tokens"],
                    "usage": usage,
                    "matches_truth": True,
                    "t": -float(120 - index),
                }
            )
            index += 1
    return receipts
