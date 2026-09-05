[CmdletBinding()]
param(
    [ValidateRange(5, 120)]
    [int]$TimeoutSeconds = 30,
    [string]$Executable = "",
    [switch]$RequireOrbDrag
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$ORB_MAX_PIXELS = 192
$LogPath = Join-Path $env:LOCALAPPDATA "com.kgkz.ambientagent\logs\ambient-agent.jsonl"
$ResultPath = Join-Path $Root "src-tauri\target\smoke-test-result.json"

if (-not $Executable) {
    $Executable = Join-Path $Root "src-tauri\target\release\ambient-desktop-agent.exe"
}
if (-not (Test-Path $Executable)) {
    throw "Smoke-test executable not found: $Executable"
}
if (Get-Process -Name "ambient-desktop-agent" -ErrorAction SilentlyContinue) {
    throw "MyBuddy-AI is already running. Stop it before a guarded smoke test."
}

$baselineLines = if (Test-Path $LogPath) { @(Get-Content -Path $LogPath).Count } else { 0 }
$startedAt = [DateTimeOffset]::UtcNow
$process = $null
$failure = $null
$orbReady = $null
$automaticSuggestion = $null
$closeHidden = $null
$minimizeRestored = $null
$panelPositioned = $null
$orbMoved = $null
$timedOut = $false
$exitedBeforeDeadline = $false
$processId = $null
$exitCode = $null
$exitAt = $null

function Get-NewDiagnosticEvents {
    if (-not (Test-Path $LogPath)) { return @() }
    return @(Get-Content -Path $LogPath | Select-Object -Skip $baselineLines | ForEach-Object {
        try { $_ | ConvertFrom-Json } catch { $null }
    } | Where-Object { $null -ne $_ })
}

try {
    Write-Host "Starting guarded MyBuddy-AI smoke test." -ForegroundColor Cyan
    Write-Host "Touchscreen escape remains available. PID will be killed after $TimeoutSeconds seconds."
    $process = Start-Process -FilePath $Executable -ArgumentList "--smoke-auto-suggestion --smoke-close-suggestion --smoke-minimize-restore" -PassThru
    $processId = $process.Id
    $orbDeadline = [DateTimeOffset]::UtcNow.AddSeconds([Math]::Min(8, $TimeoutSeconds - 1))

    while ([DateTimeOffset]::UtcNow -lt $orbDeadline -and -not $process.HasExited) {
        $orbReady = Get-NewDiagnosticEvents |
            Where-Object { $_.event -eq "native-orb-ready" } |
            Select-Object -Last 1
        if ($orbReady) { break }
        Start-Sleep -Milliseconds 200
        $process.Refresh()
    }

    if ($process.HasExited) {
        throw "MyBuddy-AI exited before native-orb validation (exit $($process.ExitCode))."
    }
    if (-not $orbReady) {
        throw "Native orb did not report readiness before the fail-closed deadline."
    }
    if ([int]$orbReady.detail.width -gt $ORB_MAX_PIXELS -or
        [int]$orbReady.detail.height -gt $ORB_MAX_PIXELS -or
        $orbReady.detail.noActivate -ne $true -or
        $orbReady.detail.topmost -ne $true -or
        $orbReady.detail.region -ne "ellipse") {
        throw "Native orb safety contract failed: $($orbReady | ConvertTo-Json -Compress)"
    }

    Write-Host "Native orb bounded/nonactivating contract verified. Testing window remains open under watchdog." -ForegroundColor Green
    $suggestionDeadline = [DateTimeOffset]::UtcNow.AddSeconds(6)
    while ([DateTimeOffset]::UtcNow -lt $suggestionDeadline -and -not $process.HasExited) {
        $automaticSuggestion = Get-NewDiagnosticEvents |
            Where-Object {
                $_.event -eq "surface-shown" -and
                $_.detail.mode -eq "automatic-no-activate"
            } |
            Select-Object -Last 1
        if ($automaticSuggestion) { break }
        Start-Sleep -Milliseconds 200
        $process.Refresh()
    }
    if (-not $automaticSuggestion) {
        throw "Automatic nonactivating suggestion did not appear before the fail-closed deadline."
    }
    Write-Host "Automatic suggestion no-activation path reported ready." -ForegroundColor Green
    $closeDeadline = [DateTimeOffset]::UtcNow.AddSeconds(6)
    while ([DateTimeOffset]::UtcNow -lt $closeDeadline -and -not $process.HasExited) {
        $closeHidden = Get-NewDiagnosticEvents |
            Where-Object { $_.event -eq "suggestion-close-hidden" } |
            Select-Object -Last 1
        if ($closeHidden) { break }
        Start-Sleep -Milliseconds 200
        $process.Refresh()
    }
    if ($process.HasExited) {
        throw "Agent exited after suggestion close; X must hide the suggestion only."
    }
    if (-not $closeHidden) {
        throw "Suggestion close interception was not reported before the fail-closed deadline."
    }
    if ($closeHidden.detail.agentAlive -ne $true -or
        $closeHidden.detail.orbVisible -ne $true -or
        $closeHidden.detail.visibility -ne "hidden") {
        throw "Suggestion close lifecycle contract failed: $($closeHidden | ConvertTo-Json -Compress)"
    }
    Write-Host "Suggestion X hid the card while the agent and orb remained alive." -ForegroundColor Green
    $restoreDeadline = [DateTimeOffset]::UtcNow.AddSeconds(8)
    while ([DateTimeOffset]::UtcNow -lt $restoreDeadline -and -not $process.HasExited) {
        $minimizeRestored = Get-NewDiagnosticEvents |
            Where-Object { $_.event -eq "surface-restored-from-minimized" } |
            Select-Object -Last 1
        if ($minimizeRestored) { break }
        Start-Sleep -Milliseconds 200
        $process.Refresh()
    }
    if (-not $minimizeRestored) {
        throw "Orb/tray explicit-open path did not restore the minimized suggestion window."
    }
    if ($minimizeRestored.detail.minimizedBefore -ne $true -or
        $minimizeRestored.detail.minimizedAfter -ne $false) {
        throw "Minimized-window restoration contract failed: $($minimizeRestored | ConvertTo-Json -Compress)"
    }
    Write-Host "Orb explicit-open path restored the minimized suggestion window." -ForegroundColor Green
    $panelPositioned = Get-NewDiagnosticEvents |
        Where-Object { $_.event -eq "panel-positioned" } |
        Select-Object -Last 1
    if (-not $panelPositioned) {
        throw "Panel placement diagnostics were not reported."
    }
    if ($panelPositioned.detail.overlapsOrb -ne $false) {
        throw "Panel overlaps the orb: $($panelPositioned | ConvertTo-Json -Compress)"
    }
    Write-Host "Panel/orb non-overlap placement verified." -ForegroundColor Green
    $deadline = $startedAt.AddSeconds($TimeoutSeconds)
    if ($RequireOrbDrag) {
        Write-Host "Drag the visible orb now; the watchdog will verify its released position." -ForegroundColor Yellow
        while ([DateTimeOffset]::UtcNow -lt $deadline -and -not $process.HasExited) {
            $orbMoved = Get-NewDiagnosticEvents |
                Where-Object { $_.event -eq "native-orb-moved" } |
                Select-Object -Last 1
            if ($orbMoved) { break }
            Start-Sleep -Milliseconds 200
            $process.Refresh()
        }
        if (-not $orbMoved) {
            throw "Required orb drag was not reported before the watchdog deadline."
        }
        Write-Host "Press-drag-release orb movement verified." -ForegroundColor Green
    }
    while ([DateTimeOffset]::UtcNow -lt $deadline -and -not $process.HasExited) {
        Start-Sleep -Milliseconds 250
        $process.Refresh()
    }
    if ($process.HasExited) {
        $exitedBeforeDeadline = $true
        $exitCode = $process.ExitCode
        $exitAt = [DateTimeOffset]::UtcNow.ToString("O")
        throw "MyBuddy-AI exited before the watchdog deadline (exit $exitCode)."
    }
    $timedOut = $true
} catch {
    $failure = $_
} finally {
    if ($process -and -not $process.HasExited) {
        Stop-Process -Id $process.Id -Force
        $process.WaitForExit(5000) | Out-Null
    }
    Get-Process -Name "ambient-desktop-agent" -ErrorAction SilentlyContinue |
        Stop-Process -Force -ErrorAction SilentlyContinue
    Start-Sleep -Milliseconds 300
}

if (Get-Process -Name "ambient-desktop-agent" -ErrorAction SilentlyContinue) {
    throw "MyBuddy-AI survived watchdog cleanup."
}

$result = [ordered]@{
    startedAt = $startedAt.ToString("O")
    processId = $processId
    timeoutSeconds = $TimeoutSeconds
    watchdogKilledProcess = $timedOut
    exitedBeforeDeadline = $exitedBeforeDeadline
    exitCode = $exitCode
    exitAt = $exitAt
    orbReady = [bool]$orbReady
    orbWidth = if ($orbReady) { [int]$orbReady.detail.width } else { $null }
    orbHeight = if ($orbReady) { [int]$orbReady.detail.height } else { $null }
    automaticSuggestionShown = [bool]$automaticSuggestion
    suggestionCloseHidden = [bool]$closeHidden
    minimizedWindowRestored = [bool]$minimizeRestored
    panelOrbNonOverlap = [bool]($panelPositioned -and $panelPositioned.detail.overlapsOrb -eq $false)
    orbDragVerified = [bool]$orbMoved
    processAbsentAfterCleanup = $true
    failure = if ($failure) { $failure.Exception.Message } else { $null }
}
New-Item -ItemType Directory -Path (Split-Path -Parent $ResultPath) -Force | Out-Null
$result | ConvertTo-Json | Set-Content -Path $ResultPath -Encoding utf8
$result | ConvertTo-Json

if ($failure) {
    throw $failure
}
