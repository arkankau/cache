from copy import deepcopy
from typing import Any

from .seed import LAKE_SEED


vendor_registry: dict[str, dict[str, Any]] = {}
gl_codes: dict[str, dict[str, Any]] = {}
state_codes: dict[str, dict[str, Any]] = {}


def reset() -> None:
    vendor_registry.clear()
    vendor_registry.update(deepcopy(LAKE_SEED["vendor_registry"]))
    gl_codes.clear()
    gl_codes.update(deepcopy(LAKE_SEED["gl_codes"]))
    state_codes.clear()
    state_codes.update(deepcopy(LAKE_SEED["state_codes"]))


def resolve(code: str) -> dict[str, Any]:
    if code in vendor_registry:
        return deepcopy(vendor_registry[code])
    if code in gl_codes:
        return deepcopy(gl_codes[code])
    if code in state_codes:
        return deepcopy(state_codes[code])
    raise KeyError(f"Unknown lake code: {code}")


def table_for(code: str) -> str:
    if code in vendor_registry:
        return "vendor_registry"
    if code in gl_codes:
        return "gl_codes"
    if code in state_codes:
        return "state_codes"
    raise KeyError(f"Unknown lake code: {code}")


def edit_state_rate(code: str, rate: float) -> dict[str, Any]:
    if code not in state_codes:
        raise KeyError(f"Unknown state code: {code}")
    state_codes[code]["rate"] = rate
    return resolve(code)


def snapshot() -> dict[str, Any]:
    return {
        "vendor_registry": deepcopy(vendor_registry),
        "gl_codes": deepcopy(gl_codes),
        "state_codes": deepcopy(state_codes),
    }


def numeric_values() -> set[str]:
    values: set[str] = set()
    for table in (vendor_registry, gl_codes, state_codes):
        for row in table.values():
            for value in row.values():
                if isinstance(value, (int, float)) and not isinstance(value, bool):
                    values.add(str(value))
    return values


reset()
