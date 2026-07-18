import asyncio
from copy import deepcopy
from time import monotonic
from typing import Any

from . import config, lake
from .agents import run_general, run_specialist, validate
from .compiler import compile_specialist
from .pool import ARRIVAL_SCHEDULE, ENTRY_POOL, held_out_for
from .seed import INITIAL_LIBRARY, frozen_seed_receipts


def derive_signature(entry: dict[str, Any]) -> str:
    vendor = lake.resolve(entry["vendor_id"])
    raw_text = entry["raw_text"].lower()
    if entry["type"] == "notification" and "duplicate" in raw_text:
        pattern = "dupe"
    elif entry["type"] == "recon" and ("across" in raw_text or "multi-state" in raw_text):
        pattern = "multistate"
    elif vendor["recon_pattern"] == "P-04" and any(cue in raw_text for cue in config.CAPEX_CUES):
        pattern = "P-04-CAPEX"
    elif vendor["recon_pattern"] == "P-22" and any(cue in raw_text for cue in config.RUSH_CUES):
        pattern = "P-22-RUSH"
    elif vendor["recon_pattern"] == "P-30" and any(cue in raw_text for cue in config.RETAINER_CUES):
        pattern = "P-30-RETAINER"
    else:
        pattern = vendor["recon_pattern"]
    return f"{entry['type']}|{pattern}"


SPECIALIST_DESCRIPTIONS = {
    "invoice|P-04": "Posts routine software subscription invoices to GL-4021 and resolves the vendor's current state treatment.",
    "invoice|P-11": "Classifies travel and entertainment invoices, preserving the meals-review control before posting.",
    "expense|P-22": "Processes contractor service expenses with live nexus context and 1099-reportable treatment.",
    "invoice|P-30": "Routes standard legal service invoices to GL-6410 using the vendor's current home-state policy.",
    "notification|dupe": "Recognizes duplicate-invoice notifications and routes them to duplicate review without a full ledger investigation.",
    "recon|multistate": "Handles multi-state reconciliations by resolving the linked state policies before creating a split review.",
    "invoice|P-04-CAPEX": "Detects multi-period prepaid software contracts and capitalizes them to GL-4890 instead of routine subscription expense.",
    "expense|P-22-RUSH": "Recognizes urgent contractor releases, retains contractor coding, and applies the expedited review procedure.",
    "invoice|P-30-RETAINER": "Identifies prepaid legal retainers and applies the retainer-review procedure with live legal and state references.",
}


class DemoEngine:
    def __init__(self, time_scale: float | None = None):
        self.time_scale = config.DEMO_TIME_SCALE if time_scale is None else time_scale
        self._task: asyncio.Task | None = None
        self._load_seed()

    def _load_seed(self) -> None:
        lake.reset()
        self.library = deepcopy(INITIAL_LIBRARY)
        for spec in self.library.values():
            spec["review_status"] = "validated"
        self.defect_agents = []
        self.receipts = frozen_seed_receipts()
        self.cost_total = sum(receipt["cost"] for receipt in self.receipts)
        self.tokens_total = sum(receipt["tokens"] for receipt in self.receipts)
        self.tasks_total = len(self.receipts)
        self.cost_points = []
        self.compute_points = []
        for index in range(19, len(self.receipts), 20):
            window = self.receipts[max(0, index - 19) : index + 1]
            self.cost_points.append(
                {"task": index + 1, "value": sum(item["cost"] for item in window) / len(window)}
            )
            self.compute_points.append(
                {"task": index + 1, "value": sum(item["compute_ms"] for item in window) / len(window)}
            )
        self.running = False
        self.current_t = 0.0
        self.emitted = 0
        self.queue_depth = 0
        self.active_distillation = None
        self.recent_distillation = None
        self.no_compress = []
        self.library_version = 0
        self.drawer = None
        self.refresh_version = 0
        self.refreshed_code = None
        self.refreshed_specialists = []
        self.last_error = None

    async def reset(self) -> None:
        if self._task and not self._task.done():
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        self._task = None
        self._load_seed()

    async def start(self) -> bool:
        if self.running:
            return False
        self.running = True
        self._task = asyncio.create_task(self._run())
        return True

    async def wait_until_complete(self) -> None:
        if self._task:
            await self._task

    async def _run(self) -> None:
        queue: asyncio.Queue = asyncio.Queue()

        async def producer() -> None:
            started = monotonic()
            for scheduled in ARRIVAL_SCHEDULE:
                target = scheduled["t_seconds"] * self.time_scale
                delay = target - (monotonic() - started)
                if delay > 0:
                    await asyncio.sleep(delay)
                await queue.put(deepcopy(scheduled))
                self.emitted += 1
                self.queue_depth = queue.qsize()
            await queue.put(None)

        async def consumer() -> None:
            while True:
                scheduled = await queue.get()
                self.queue_depth = queue.qsize()
                if scheduled is None:
                    break
                entry = deepcopy(ENTRY_POOL[scheduled["entry_id"]])
                self.current_t = float(scheduled["t_seconds"])
                await self.process_entry(entry, self.current_t)

        try:
            await asyncio.gather(producer(), consumer())
        except asyncio.CancelledError:
            raise
        except Exception as exc:
            self.last_error = str(exc)
        finally:
            self.running = False
            self.active_distillation = None
            self.queue_depth = 0

    async def process_entry(self, entry: dict[str, Any], t: float) -> dict[str, Any]:
        signature = derive_signature(entry)
        vendor = lake.resolve(entry["vendor_id"])
        spec = self.library.get(signature)

        if spec and spec["validated"]:
            run = await run_specialist(spec, entry)
            result = run["result"]
            receipt = self._receipt(
                entry, vendor["name"], signature, "specialist", result, t, run["resolved_codes"],
                spec["specialist_id"],
            )
            self._record_receipt(receipt)
            return receipt

        self.active_distillation = {
            "entry_id": entry["entry_id"],
            "vendor": vendor["name"],
            "case_signature": signature,
            "route": "distilling",
            "entry_type": entry["type"],
            "amount": entry["amount"],
            "raw_text": entry["raw_text"],
            "context_codes": [entry["vendor_id"], vendor["default_gl"], vendor["home_state"]],
            "t": t,
        }
        trace = await run_general(entry)
        candidate = compile_specialist(trace, entry)
        gate = await validate(candidate, held_out_for(signature)[: config.HELD_OUT_K])

        self.cost_total += gate["cost"]
        self.tokens_total += gate["tokens"]
        if gate["passed"]:
            candidate["review_status"] = "pending_review"
            self.library[signature] = candidate
            self.library_version += 1
        else:
            self.no_compress.append(signature)

        result = trace["result"]
        receipt = self._receipt(entry, vendor["name"], signature, "general", result, t, {}, None)
        self._record_receipt(receipt)
        first_validation = gate["runs"][0]["result"] if gate["runs"] else None
        self.drawer = {
            "case_signature": signature,
            "general": {
                "summary": trace["reasoning_summary"],
                "answer": result["answer"],
                "cost": result["cost"],
                "tokens": result["usage"]["total_tokens"],
                "compute_ms": result["compute_ms"],
            },
            "specialist": {
                "summary": (
                    f"{signature} -> {result['answer']['gl_code']}. "
                    "Vendor and state context resolve live."
                ),
                "answer": first_validation["answer"] if first_validation else {},
                "cost": first_validation["cost"] if first_validation else 0.0,
                "tokens": first_validation["usage"]["total_tokens"] if first_validation else 0,
                "compute_ms": first_validation["compute_ms"] if first_validation else 0.0,
                "validation": deepcopy(candidate["validation"]),
            },
        }
        self.recent_distillation = {
            "specialist_id": candidate["specialist_id"],
            "case_signature": signature,
            "vendor": vendor["name"],
            "context_codes": deepcopy(candidate["code_references"]),
            "validation": deepcopy(candidate["validation"]),
            "promoted": gate["passed"],
            "version": self.library_version,
        }
        self.active_distillation = None
        return receipt

    def _receipt(
        self,
        entry: dict[str, Any],
        vendor: str,
        signature: str,
        route: str,
        result: dict[str, Any],
        t: float,
        resolved_codes: dict[str, Any],
        specialist_id: str | None,
    ) -> dict[str, Any]:
        return {
            "entry_id": entry["entry_id"],
            "vendor": vendor,
            "entry_type": entry["type"],
            "amount": entry["amount"],
            "raw_text": entry["raw_text"],
            "case_signature": signature,
            "route": route,
            "answer": deepcopy(result["answer"]),
            "cost": result["cost"],
            "tokens": result["usage"]["total_tokens"],
            "usage": deepcopy(result["usage"]),
            "model": result["model"],
            "model_mode": result["mode"],
            "compute_ms": result["compute_ms"],
            "specialist_id": specialist_id,
            "matches_truth": result["answer"] == entry["_ground_truth"],
            "resolved_codes": deepcopy(resolved_codes),
            "t": t,
        }

    def _record_receipt(self, receipt: dict[str, Any]) -> None:
        self.receipts.append(receipt)
        self.tasks_total += 1
        self.cost_total += receipt["cost"]
        self.tokens_total += receipt["tokens"]
        self.cost_points.append(
            {"task": self.tasks_total, "value": self._rolling_cost()}
        )
        self.compute_points.append(
            {"task": self.tasks_total, "value": self._rolling_compute_ms()}
        )

    def _rolling_cost(self) -> float:
        window = self.receipts[-20:]
        return sum(receipt["cost"] for receipt in window) / len(window)

    def _rolling_compute_ms(self) -> float:
        window = self.receipts[-20:]
        return sum(receipt["compute_ms"] for receipt in window) / len(window)

    def review_agent(self, specialist_id: str, decision: str) -> dict[str, Any]:
        item = next(
            ((signature, spec) for signature, spec in self.library.items() if spec["specialist_id"] == specialist_id),
            None,
        )
        if item is None:
            raise ValueError(f"Unknown specialist: {specialist_id}")
        signature, spec = item
        if str(spec["distilled_from"]).startswith("SEED-"):
            raise ValueError("Seed specialists are already validated")
        if decision == "approve":
            spec["review_status"] = "validated"
            reviewed = deepcopy(spec)
        elif decision == "reject":
            reviewed = deepcopy(spec)
            reviewed["review_status"] = "defect"
            self.defect_agents.append(reviewed)
            del self.library[signature]
        else:
            raise ValueError("Decision must be approve or reject")
        self.library_version += 1
        return reviewed

    def edit_lake_rate(self, code: str = "ST-CA-07", rate: float = 0.08) -> dict[str, Any]:
        row = lake.edit_state_rate(code, rate)
        self.refreshed_code = code
        self.refreshed_specialists = [
            spec["specialist_id"]
            for spec in self.library.values()
            if code in spec["code_references"]
        ]
        self.refresh_version += 1
        return row

    def update_specialist_context(self, specialist_id: str, code: str, action: str) -> dict[str, Any]:
        lake.resolve(code)
        spec = next(
            (item for item in self.library.values() if item["specialist_id"] == specialist_id),
            None,
        )
        if spec is None:
            raise ValueError(f"Unknown specialist: {specialist_id}")
        references = spec["code_references"]
        if action == "attach" and code not in references:
            references.append(code)
        elif action == "detach" and code in references:
            references.remove(code)
        elif action not in {"attach", "detach"}:
            raise ValueError("Action must be attach or detach")
        self.library_version += 1
        return deepcopy(spec)

    def state(self) -> dict[str, Any]:
        links = [
            {
                "specialist_id": spec["specialist_id"],
                "case_signature": signature,
                "code_references": deepcopy(spec["code_references"]),
                "retrieval_plan": deepcopy(spec["retrieval_plan"]),
                "distilled_from": spec["distilled_from"],
                "model_tier": spec["model_tier"],
                "validation": deepcopy(spec["validation"]),
                "generated": not str(spec["distilled_from"]).startswith("SEED-"),
                "description": SPECIALIST_DESCRIPTIONS.get(
                    signature,
                    "Executes the validated procedure for this exact ledger case signature.",
                ),
                "context_size": 70 + len(spec["code_references"]) * 18 + len(spec["retrieval_plan"]) * 12,
                "review_status": spec.get("review_status", "validated"),
                "refreshed": spec["specialist_id"] in self.refreshed_specialists,
            }
            for signature, spec in self.library.items()
        ]
        return {
            "mode": "mock" if config.MOCK_MODE else "real-with-fallback",
            "models": deepcopy(config.MODELS),
            "poll_ms": config.POLL_MS,
            "running": self.running,
            "t": self.current_t,
            "queue_depth": self.queue_depth,
            "active_distillation": deepcopy(self.active_distillation),
            "recent_distillation": deepcopy(self.recent_distillation),
            "receipts": deepcopy(self.receipts[-30:]),
            "cost_total": self.cost_total,
            "tokens_total": self.tokens_total,
            "tasks_total": self.tasks_total,
            "cost_per_task": self._rolling_cost(),
            "compute_time_per_task": self._rolling_compute_ms(),
            "cost_points": deepcopy(self.cost_points[-32:]),
            "compute_points": deepcopy(self.compute_points[-32:]),
            "library_count": len(self.library),
            "library_version": self.library_version,
            "specialist_links": links,
            "defect_agents": [
                {
                    "specialist_id": spec["specialist_id"],
                    "case_signature": spec["case_signature"],
                    "review_status": "defect",
                    "description": SPECIALIST_DESCRIPTIONS.get(spec["case_signature"], "Defective specialist"),
                    "code_references": deepcopy(spec["code_references"]),
                    "retrieval_plan": deepcopy(spec["retrieval_plan"]),
                    "distilled_from": spec["distilled_from"],
                    "model_tier": spec["model_tier"],
                    "validation": deepcopy(spec["validation"]),
                    "generated": True,
                    "context_size": 70 + len(spec["code_references"]) * 18 + len(spec["retrieval_plan"]) * 12,
                }
                for spec in self.defect_agents
            ],
            "no_compress": deepcopy(self.no_compress),
            "drawer": deepcopy(self.drawer),
            "lake": lake.snapshot(),
            "refreshed_code": self.refreshed_code,
            "refreshed_specialists": deepcopy(self.refreshed_specialists),
            "refresh_version": self.refresh_version,
            "last_error": self.last_error,
        }
