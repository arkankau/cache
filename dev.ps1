$ErrorActionPreference = "Stop"
$RepoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$PythonPath = Join-Path $RepoRoot ".venv\Scripts\python.exe"

if (-not (Test-Path $PythonPath)) {
    throw "Run the setup commands in README.md before starting the demo."
}

$Backend = Start-Process `
    -FilePath $PythonPath `
    -ArgumentList "-m", "uvicorn", "backend.main:app", "--reload", "--host", "127.0.0.1", "--port", "8000" `
    -WorkingDirectory $RepoRoot `
    -WindowStyle Hidden `
    -PassThru

try {
    Set-Location (Join-Path $RepoRoot "frontend")
    npm run dev
}
finally {
    Stop-Process -Id $Backend.Id -Force -ErrorAction SilentlyContinue
}
