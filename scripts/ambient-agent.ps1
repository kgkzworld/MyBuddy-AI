[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [ValidateSet("Setup", "Status", "Logs", "Stop", "Verify", "Dev", "Build")]
    [string]$Action
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$env:NODE_ENV = "development"

function Require-Command {
    param([string]$Name, [string]$InstallHint)
    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        throw "Missing required command '$Name'. $InstallHint"
    }
}

function Invoke-Checked {
    param([string]$Label, [scriptblock]$Command)
    Write-Host "`n==> $Label" -ForegroundColor Cyan
    & $Command
    if ($LASTEXITCODE -ne 0) {
        throw "$Label failed with exit code $LASTEXITCODE."
    }
}

function Show-Status {
    Require-Command node "Install Node.js LTS."
    Require-Command npm "Install Node.js LTS."
    Require-Command rustc "Install Rust through rustup."
    Require-Command cargo "Install Rust through rustup."

    Write-Host "Node:  $(node --version)"
    Write-Host "npm:   $(npm --version)"
    Write-Host "Rust:  $(rustc --version)"
    Write-Host "Cargo: $(cargo --version)"

    if (Get-Command lms -ErrorAction SilentlyContinue) {
        Write-Host "`nLM Studio models:"
        lms ps
    } else {
        Write-Warning "LM Studio CLI 'lms' was not found; fallback UI still works."
    }

    try {
        $models = Invoke-RestMethod -Uri "http://127.0.0.1:1234/v1/models" -TimeoutSec 3
        Write-Host "LM Studio API: ready ($($models.data.Count) model entries)" -ForegroundColor Green
    } catch {
        Write-Warning "LM Studio API is unavailable; the app will use its rules fallback."
    }
}

function Show-AgentLogs {
    $log = Join-Path $env:LOCALAPPDATA "com.kgkz.ambientagent\logs\ambient-agent.jsonl"
    if (-not (Test-Path $log)) {
        Write-Host "No native diagnostic log exists yet: $log"
        return
    }
    Write-Host "Diagnostic log: $log" -ForegroundColor Cyan
    Get-Content -Path $log -Tail 100
}

function Stop-Agent {
    $processes = Get-Process -Name "ambient-desktop-agent" -ErrorAction SilentlyContinue
    if (-not $processes) {
        Write-Host "MyBuddy-AI is not running."
        return
    }
    $processes | Stop-Process -Force
    Start-Sleep -Milliseconds 250
    if (Get-Process -Name "ambient-desktop-agent" -ErrorAction SilentlyContinue) {
        throw "MyBuddy-AI did not stop."
    }
    Write-Host "MyBuddy-AI stopped." -ForegroundColor Green
}

Push-Location $Root
try {
    switch ($Action) {
        "Setup" {
            Show-Status
            Invoke-Checked "Install npm dependencies" { npm install --include=dev }
        }
        "Status" {
            Show-Status
        }
        "Logs" {
            Show-AgentLogs
        }
        "Stop" {
            Stop-Agent
        }
        "Verify" {
            Show-Status
            Invoke-Checked "TypeScript tests" { npm test }
            Invoke-Checked "TypeScript and Vite production build" { npm run build }
            Invoke-Checked "Rust tests" { cargo test --manifest-path src-tauri/Cargo.toml }
            Invoke-Checked "Rust compile check" { cargo check --manifest-path src-tauri/Cargo.toml }
        }
        "Dev" {
            Write-Warning "Interactive action: do not run unattended or while the user is relying on the desktop."
            Show-Status
            Invoke-Checked "Tauri development host" { npm run tauri dev }
        }
        "Build" {
            & $PSCommandPath -Action Verify
            Invoke-Checked "Tauri native bundle" { npm run tauri build }
        }
    }
} finally {
    Pop-Location
}
