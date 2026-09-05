# Privacy and Threat Boundary

## Collected now

- Active process/application name.
- Active window title.
- Observation timestamp.
- Local UI interaction events, coarse confidence/source values, and non-sensitive surface safety facts such as orb dimensions and activation mode in capped browser local storage and a redacted native JSONL diagnostic log.

## Not collected now

- Screenshots or pixels.
- OCR.
- Keystrokes.
- Clipboard.
- File or document contents, except the one canonical schedule note after an explicit vault-schedule question as described below.
- Browser history or URLs beyond what may already appear in a window title.
- Audio or camera data.
- Notification/toast payloads or text.

## Default exclusions

The privacy policy blocks contexts containing password-manager, credential, sign-in, two-factor, banking, payment, checkout, incognito, InPrivate, or private-browsing indicators. Blocked metadata is not sent to detection or Qwen.

## Storage

The mockup keeps at most 100 coarse operational events in WebView local storage and appends redacted diagnostics to `%LOCALAPPDATA%\com.kgkz.ambientagent\logs\ambient-agent.jsonl`. Exact persistent action grants are also stored locally with capability ID, grant time, use count, and last-use time; Settings can revoke each grant. Native logging removes fields named `title`, `windowTitle`, `text`, `content`, `password`, `secret`, and `token`. It does not persist raw observation timelines. This is sufficient for troubleshooting, not production audit requirements.

## Model boundary

LM Studio is addressed only through `http://127.0.0.1:1234` and remains the built-in default. Automatic analysis includes a compact allowed window-event episode. A message typed into the composer is sent only after explicit Send/Enter to the provider the user selected in Settings; submitted text is displayed in the current card but is not included in diagnostic events or persisted observation history. CLI providers such as Codex may use their own authenticated cloud service, so selecting one is an explicit privacy-boundary change. MyBuddy never selects a detected CLI automatically and never falls back to another provider.

An explicit question naming the vault/Obsidian and schedule/calendar/appointments/events authorizes one bounded read of `OBSIDIAN_VAULT_PATH/010_Personal/001_Schedule/001_Schedule.md`. The 64 KiB-capped note is sent as untrusted reference data only to the already selected provider. MyBuddy does not search other files, expose provider file tools, write the vault, retain the note in diagnostics, or claim that Google Calendar, Apple Calendar, or Apple Reminders were checked. Ordinary questions perform no vault read.

## Execution boundary

Version 0.1.5 retains three fixed compatibility adapters, but ADA-054 routes unknown explicit action goals to an app-general allow-once Computer Use executor. Before guidance or execution, the exact prior PID/HWND/title must still pass the existing metadata privacy policy. Only the bounded current accessibility inventory and approved goal go to the configured local provider; raw snapshots are not written to diagnostics. Execution accepts current enabled semantic click tokens and, under ADA-055, one exact-window `bring_to_front` decision only for explicit foreground/front/focus/activate goals. Foreground success requires returned `now_fg_hwnd` to equal the approved HWND. It has no script, command, hotkey, typing, coordinate, pixel, arbitrary foreground escalation, app-launch, or old-adapter fallback. General grants cannot be persisted. Passwords, secrets, authentication, 2FA, banking/payment, permission prompts, destructive goals, file selection, and typed input are outside this capability. MyBuddy's approval UI is not controllable by this executor.

ADA-056 changes only the local inference transport for bounded structured guidance/planning: LM Studio uses Responses with reasoning disabled. The same filtered semantic inventory and approved goal are sent locally; no additional screen data, cloud fallback, retention, or execution authority is introduced.
