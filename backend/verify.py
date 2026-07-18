import asyncio
import json
from copy import deepcopy

from . import lake, models
from .agents import run_general
from .compiler import compile_specialist
from .loop import DemoEngine
from .pool import ENTRY_POOL


async def verify() -> dict[str, bool]:
    models.LATENCY_SCALE = 0
    engine = DemoEngine(time_scale=0.001)
    opening = engine.state()

    assert 1.67 < opening["cost_total"] < 1.69
    assert 141_000 < opening["tokens_total"] < 143_000
    assert opening["library_count"] == 6
    assert opening["models"]["frontier"] == "gpt-5.6-sol"

    await engine.start()
    await engine.wait_until_complete()
    final = engine.state()

    live = {receipt["entry_id"]: receipt for receipt in final["receipts"]}
    hero = live["E-HERO"]
    repeat = live["E-H03"]
    rush_repeat = live["E-RUSH-REPEAT"]
    retainer_repeat = live["E-RETAINER-REPEAT"]
    capex_spec = engine.library["invoice|P-04-CAPEX"]

    assert hero["route"] == "general"
    assert capex_spec["validation"] == {"held_out_matches": 5, "held_out_total": 5}
    assert final["library_count"] == 9
    assert repeat["route"] == "specialist" and repeat["matches_truth"]
    assert rush_repeat["route"] == "specialist" and rush_repeat["matches_truth"]
    assert retainer_repeat["route"] == "specialist" and retainer_repeat["matches_truth"]
    assert final["cost_per_task"] < opening["cost_per_task"]

    await engine.reset()
    reset_a = engine.state()
    await engine.reset()
    reset_b = engine.state()
    assert reset_a == reset_b == opening

    before_library = deepcopy(engine.library)
    engine.edit_lake_rate("ST-CA-07", 0.08)
    refreshed = engine.state()
    assert refreshed["refreshed_specialists"]
    receipt = await engine.process_entry(deepcopy(ENTRY_POOL["E-R01"]), 81)
    assert receipt["resolved_codes"]["ST-CA-07"]["rate"] == 0.08
    assert engine.library == before_library

    await engine.reset()
    trace = await run_general(deepcopy(ENTRY_POOL["E-HERO"]))
    trace["reasoning_summary"] += f" Current literal rate is {lake.resolve('ST-CA-07')['rate']}."
    hard_assert_fired = False
    try:
        compile_specialist(trace, deepcopy(ENTRY_POOL["E-HERO"]))
    except AssertionError:
        hard_assert_fired = True
    assert hard_assert_fired

    return {
        "offline_mock": True,
        "routine_specialist": live["E-R01"]["route"] == "specialist",
        "hero_general": hero["route"] == "general",
        "library_6_to_9": final["library_count"] == 9,
        "validation_5_of_5": capex_spec["validation"]["held_out_matches"] == 5,
        "repeat_specialist_match": repeat["matches_truth"],
        "cost_per_task_descends": final["cost_per_task"] < opening["cost_per_task"],
        "lake_edit_live": receipt["resolved_codes"]["ST-CA-07"]["rate"] == 0.08,
        "compiler_assert": hard_assert_fired,
        "reset_deterministic": reset_a == reset_b == opening,
        "costs_from_usage": all("usage" in item for item in live.values()),
        "frontier_model_is_sol": opening["models"]["frontier"] == "gpt-5.6-sol",
    }


if __name__ == "__main__":
    print(json.dumps(asyncio.run(verify()), indent=2, sort_keys=True))
