# MyBuddy-AI — Desktop Assistant Mockup

A local-first desktop assistant and visual interface to a selected equipped Codex, Claude, Qwen, or Hermes runtime. It observes privacy-approved active-window metadata, detects simple struggle patterns, renders help as Adaptive Cards, and exposes bounded local/visual capabilities where MBAI—not the selected model—must mediate the desktop. The source folder and internal application identifier retain their original names for compatibility.

Private canonical GitHub repository: <https://github.com/kgkzworld/MyBuddy-AI>

The name and companion-first product idea are inspired by the 1980s [My Buddy commercial](https://www.youtube.com/watch?v=OdximU6Ao00): give AI a friendly face that stays close, is quick to reach, answers, teaches, and helps. This project is not affiliated with the toy brand and does not reuse its character, music, or artwork.

## Current safety boundary

- Reads **active application name and window title only**.
- Does **not** capture screenshots, keystrokes, clipboard data, or document contents.
- Blocks known password, authentication, banking, payment, and private-browsing contexts before detection or reasoning.
- Desktop control is limited to registered bounded capabilities, explicit action scope, and post-action verification. Unsupported or sensitive actions stop safely.
- Runs as a per-user tray/menu-bar application, not a Windows Service.

## Stack

- Tauri 2 and Rust for the cross-platform desktop host.
- TypeScript and the Adaptive Cards JavaScript renderer for interaction UI.
- `active-win-pos-rs` for Windows/macOS/Linux active-window metadata.
- Local LM Studio OpenAI-compatible API.
- Fast routine model: Qwen2.5 Coder 3B (`autocomplete`).
- Future deeper escalation: Qwen3.6 35B (`instruct`), Codex, Claude, or Buzz through explicit adapters.

## Quick start

```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\scripts\ambient-agent.ps1 -Action Setup
python .\harness\scripts\install_harness.py
.\scripts\ambient-agent.ps1 -Action Verify
.\scripts\ambient-agent.ps1 -Action Dev
```

Launch the built 0.1.6 executable directly:

```powershell
& "D:/Source/Dev/Git/Pub/MyBuddy-AI/src-tauri/target/release/ambient-desktop-agent.exe"
```

The application starts with a small native circular orb and a notification-area icon. The orb remains always on top without accepting keyboard focus. Automatic suggestions use a separate opaque, non-topmost WebView window shown with Win32 no-activation flags so the current application keeps focus. It is not configured to launch at sign-in.

For complete Windows, macOS, and Linux installation paths, see [Install MyBuddy-AI](docs/INSTALL.md). It includes click-through instructions, source builds, automation scripts, an AI-assisted workflow, and an honest platform-support matrix.

## Contextual conversations and explicit reset — ADA-080

- Follow-up questions carry a bounded in-memory window of the recent user/assistant exchange to the same selected AI. A request such as `can you get me the link to the email` can therefore resolve “the email” from the result immediately above it instead of starting an unrelated one-shot query.
- **Clear** starts a new conversation, removes the retained message window and prepared-application identity, clears pending approvals, and leaves no conversation text in diagnostics. It is unavailable while a request is running; use **Cancel** first when necessary.
- Conversation context is process-local, limited to eight messages and 2,000 characters per message, and resets when MyBuddy-AI exits.
- The canonical Windows release was relaunched and the user confirmed the real email-search → contextual email-link follow-up works end to end.

## MyBuddy-AI portable harness milestone — 0.1.6

Repository `harness/` is the canonical portable source for MBAI-specific skills, workflow declarations, and cron definitions used by whichever equipped LLM is selected. Tauri packages it with the app; MBAI supplies `MBAI_HARNESS_PATH` to selected runtimes; profiles store `${MBAI_HARNESS_PATH}/skills` rather than a workstation path. Credentials, sessions, approvals, and live scheduler state remain machine-local.

The Windows orb and system adapters are not yet implemented on macOS. The Mac build uses an opaque non-private-API panel configuration, and native build/sign/notarization remains unverified. See [macOS compatibility](docs/MACOS-COMPATIBILITY.md).

## Cancellable requests, live activity, and natural process targets — ADA-077

- While a request is active, the mini-screen shows **Cancel**. Cancellation is bound to the current request ID, terminates the selected CLI runtime's Windows Job Object (including descendants), rejects late output, restores the configured avatar, and re-enables the composer.
- **Live log** opens a bounded in-panel activity history containing only controlled stage labels and timestamps. It never renders raw prompts, provider output, command lines, credentials, or private source content.
- Natural application wording such as `MS Edge browser window` resolves against running executable metadata, so the user does not need to supply `msedge.exe`, a PID, or an HWND. Named-process termination retains allow-once approval, protected-target checks, bounded matching, and post-action verification.

## Earlier interaction milestone — 0.1.4

Version 0.1.0's transparent always-on-top WebView could intercept desktop input even after observation was paused. Version 0.1.1 was temporary containment, version 0.1.2 restored the safe two-surface architecture, and version 0.1.3 fixed close behavior and restored the orb visual. Version 0.1.4 adds the approved **MyBuddy-AI** product name and completes the question/minimize interaction paths:

- The orb is a native Win32 window with a circular window region, `WS_EX_NOACTIVATE`, a hard 192-pixel cap, monitor-work-area bounds checks, and a runtime guard that exits on an invalid rectangle.
- The native orb recreates the original cyan/violet/pink gradient, upper-left highlight, inset edge shading, and green status indicator, with a friendly bot face replacing the original `A` mark.
- The Adaptive Card window is separate, opaque, non-topmost, and shown without activation for automatic suggestions.
- Either the card's in-app X or the native title-bar X hides the suggestion only. The observer, tray process, and orb continue running; only tray **Quit** or the exact-process `Stop` operation exits the agent.
- Clicking the orb or using the tray is explicit and may activate the card window. If the card window is minimized, the explicit-open path calls native `unminimize()` before showing and focusing it.
- The mini-window footer has a persistent field for questions and help requests. Ordinary questions go only to local Qwen; when LM Studio is offline, MyBuddy-AI reports that state and does not use a cloud fallback.
- Wording such as “take over,” “click,” or “submit” creates a preview-only scope card. Text submission is an intent, not execution authority; desktop control remains disabled.
- A 15-second nonactivating fake-toast test is available, but the current active-window-only observer cannot read its pixels or text. Notification-aware advice requires a separately reviewed notification adapter or opt-in OCR milestone.
- Pause stops observation and hides the suggestion window while leaving the bounded status orb available.
- A guarded smoke-test script independently terminates the process after 30 seconds and fails closed if the safety contract is not reported.

The 0.1.0 bundles were deleted and must not be used. Versions 0.1.1–0.1.3 remain historical milestones and are superseded by 0.1.4.

Native redacted diagnostics are written to `%LOCALAPPDATA%\com.kgkz.ambientagent\logs\ambient-agent.jsonl`.

## Documentation — always three ways

1. [Manual procedure](docs/MANUAL.md)
2. [Script and automation procedure](docs/AUTOMATION.md)
3. [AI-agent playbook](docs/AI-PLAYBOOK.md)
4. [Cross-platform installation](docs/INSTALL.md) and [AI installer playbook](docs/AI-INSTALL.md)

Additional references:

- [Architecture](docs/ARCHITECTURE.md)
- [As-built record](docs/AS-BUILT.md)
- [Privacy and threat boundary](docs/PRIVACY.md)
- [macOS compatibility](docs/MACOS-COMPATIBILITY.md)

## Verification

```powershell
.\scripts\ambient-agent.ps1 -Action Verify
```

The verification gate runs TypeScript tests, frontend compilation, production web build, Rust tests, and `cargo check`.

Guarded interactive validation:

```powershell
.\scripts\guarded-smoke-test.ps1 -TimeoutSeconds 30
```
