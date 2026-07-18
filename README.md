# Cache

Cache is a deterministic finance-ops demo for Northwind Software. It shows a frontier model solving a novel ledger case once, compiling that trace into a validated cheap specialist, and routing repeats through the specialist while resolving policy codes live from the source-of-truth lake.

The demo defaults to `MOCK_MODE=True` and makes no model network calls.

## Setup

```powershell
C:\Users\User\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
npm --prefix frontend install
```

## Run

```powershell
make dev
```

Or use two terminals:

```powershell
.\.venv\Scripts\python.exe -m uvicorn backend.main:app --reload --host 127.0.0.1 --port 8000
npm --prefix frontend run dev
```

Open `http://127.0.0.1:5173`.

## Verify

```powershell
.\.venv\Scripts\python.exe -m backend.verify
npm --prefix frontend run build
```

Set `MOCK_MODE=False` and provide `OPENAI_KEY_MAIN` only when rehearsing the real model path. `OPENAI_KEY_GEN` is intentionally separate and unused because the generator emits a prebuilt schedule.
