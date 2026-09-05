[CmdletBinding()]
param(
    [switch]$BuildBundle,
    [switch]$Install,
    [string[]]$Profile = @("default", "hermescodex", "hermesclaude", "hermesqwen")
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest
$RepositoryRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path

function Require-Command([string]$Name, [string]$Help) {
    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        throw "$Name is required. $Help"
    }
}

Require-Command "node" "Install Node.js LTS from https://nodejs.org/."
Require-Command "npm" "Install Node.js LTS from https://nodejs.org/."
Require-Command "rustc" "Install Rust from https://rustup.rs/."
Require-Command "cargo" "Install Rust from https://rustup.rs/."
Require-Command "python" "Install Python 3.11 or newer and add it to PATH."
Require-Command "hermes" "Install Hermes Agent from https://hermes-agent.nousresearch.com/docs/installation/."

Push-Location $RepositoryRoot
try {
    & npm ci --include=dev
    if ($LASTEXITCODE -ne 0) { throw "npm dependency installation failed" }

    $HarnessArguments = @("harness/scripts/install_harness.py")
    foreach ($Name in $Profile) {
        $HarnessArguments += @("--profile", $Name)
    }
    & python @HarnessArguments
    if ($LASTEXITCODE -ne 0) { throw "MBAI harness installation failed" }

    & npm test
    if ($LASTEXITCODE -ne 0) { throw "TypeScript tests failed" }
    & npm run build
    if ($LASTEXITCODE -ne 0) { throw "frontend build failed" }
    & cargo test --manifest-path src-tauri/Cargo.toml
    if ($LASTEXITCODE -ne 0) { throw "Rust tests failed" }
    & cargo check --manifest-path src-tauri/Cargo.toml
    if ($LASTEXITCODE -ne 0) { throw "Rust check failed" }

    if ($BuildBundle -or $Install) {
        & npm run tauri build
        if ($LASTEXITCODE -ne 0) { throw "Tauri bundle build failed" }
    }

    if ($Install) {
        $Installer = Get-ChildItem "src-tauri/target/release/bundle/nsis" -Filter "*-setup.exe" -File |
            Sort-Object LastWriteTime -Descending |
            Select-Object -First 1
        if (-not $Installer) {
            throw "No NSIS installer was produced"
        }
        $Process = Start-Process -FilePath $Installer.FullName -Wait -PassThru
        if ($Process.ExitCode -ne 0) {
            throw "MyBuddy-AI installer exited with code $($Process.ExitCode)"
        }
        Write-Host "Installed and verified installer exit: $($Installer.FullName)"
    } elseif ($BuildBundle) {
        Write-Host "Bundles are under src-tauri/target/release/bundle"
    } else {
        Write-Host "Source dependencies, harness, tests, and builds are verified. Re-run with -BuildBundle or -Install when wanted."
    }
} finally {
    Pop-Location
}
