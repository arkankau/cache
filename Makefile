.PHONY: dev verify

dev:
	powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\dev.ps1

verify:
	.\.venv\Scripts\python.exe -m backend.verify
