# macOS Compatibility

## Current status

MyBuddy-AI 0.1.6 is **source-portable but not feature-complete or release-validated on macOS**. The repository contains a macOS Tauri override that uses an opaque main window and avoids the private transparent-window API. A signed/notarized `.app` or `.dmg` has not been produced because macOS builds require a Mac with Xcode and Apple signing tooling.

## Expected to work after a native Mac build

| Area | Status | Conditions |
|---|---|---|
| TypeScript conversation UI and Adaptive Cards | Expected | Native Tauri/WebKit build |
| Tray/menu-bar Show action | Expected | The main window starts hidden; use the tray action because the Windows orb is absent |
| Local time and provider-independent UI utilities | Expected | No OS-specific dependency |
| LM Studio and no-key OpenAI-compatible HTTP endpoints | Expected | Endpoint is reachable |
| Codex/Claude/Qwen/Hermes equipped-agent passthrough | Expected | Hermes and selected profiles are installed/configured and CLI executables are visible in the GUI app's `PATH` |
| Packaged MBAI harness | Expected | Run the packaged `harness/scripts/install_harness.py` once for the target Hermes profiles |
| Vault skill | Expected | Set machine-local `OBSIDIAN_VAULT_PATH` to the Mac vault path |
| Read-only Gmail skill | Expected | Install Python plus Composio, configure the credential in the process environment, and retain active Gmail connections |

## Not currently available on macOS

| Feature | Source boundary | Current behavior |
|---|---|---|
| Always-on-top native orb and shaped thought-bubble window | `src-tauri/src/orb.rs`, `src-tauri/src/lib.rs` | Native orb code is Windows-gated. The tray can show the ordinary opaque panel, but there is no floating orb or native shaped region. |
| Running-application query | `src-tauri/src/observer.rs` | Returns Windows-only unsupported error. |
| Running-services query | `src-tauri/src/observer.rs` | Returns Windows-only unsupported error. A macOS implementation should query launchd/process state through a bounded adapter. |
| Top-memory application ranking | `src-tauri/src/observer.rs` | Returns Windows-only unsupported error. |
| Exact visible-window accessibility text | `src-tauri/src/observer.rs` | Returns unsupported. Requires an AX adapter and explicit Accessibility permission. |
| Named-process termination | `src-tauri/src/process_control.rs` | Returns Windows-only unsupported error. |
| Word and Notepad++ native takeover adapters | `src-tauri/src/word_takeover.rs`, `src-tauri/src/notepad_takeover.rs` | Return Windows-only unsupported errors. |
| AutoHotkey paced demonstration | `src-tauri/src/computer_use_takeover.rs` | AutoHotkey and Win32 HWND/PID validation are Windows-specific. A macOS executor is not implemented. |
| MBAI OpenAI-compatible API-key storage | `src-tauri/src/provider.rs` | Key reads return none and writes fail because only Windows Credential Manager is implemented. Hermes profile credentials remain separate and can still work. |

## Degraded or unverified

- The non-Windows panel fallback uses ordinary `window.show()` and does not reproduce the Win32 no-activation or native thought-bubble-region guarantees.
- `active-win-pos-rs` can provide initial application/title metadata on macOS after Screen Recording approval, but MBAI currently sets the native window handle to `0`. Exact-HWND workflows therefore cannot reuse that observer snapshot.
- `cua-driver` subprocess invocation itself is not Windows-gated, but MBAI's complete generic visual workflow has not been accepted on macOS and still contains Windows/AutoHotkey assumptions for demonstrations.
- GUI apps launched from Finder may have a smaller `PATH` than an interactive shell. Hermes and selected CLI launchers must be discoverable from the app process.
- CLI supervision waits for process exit before draining piped output. A verbose provider could fill an OS pipe and time out; concurrent bounded pipe readers remain a cross-platform hardening item.
- `scripts/ambient-agent.ps1` is Windows-only. Native macOS setup/build/status/smoke wrappers or CI do not yet exist; the manual commands below are the current developer path.
- The app has not been built, signed, notarized, installed, or smoke-tested on Apple silicon or Intel macOS.

## macOS release gate

On a Mac:

```bash
xcode-select --install
npm install
python3 harness/scripts/install_harness.py
npm test
npm run build
cargo fmt --manifest-path src-tauri/Cargo.toml -- --check
cargo test --manifest-path src-tauri/Cargo.toml --no-fail-fast
npm run tauri build
```

Then verify the tray restoration path, selected Hermes profile, packaged harness discovery, vault/Gmail read-only requests, Screen Recording behavior, app signing, notarization, and a clean install on a second Mac. Do not claim macOS support until these native gates pass.
