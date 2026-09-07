# MyBuddy-AI Manual Procedure

## Install MyBuddy-AI on Windows, macOS, or Linux

- Follow `docs/INSTALL.md` for the click-through installer and source-build procedure for the target operating system.
- Windows is the verified complete implementation. macOS and Linux installation paths are documented and automated, but their native feature parity remains incomplete; do not treat a successful package build as proof of Win32-only features.
- The product's companion-first inspiration is the 1980s My Buddy commercial linked in the install guide. MyBuddy-AI is an independent project and does not reuse the toy's protected assets.

## Save a YouTube transcript in the vault — ADA-078

1. Ask naturally for the YouTube video to be transcribed and saved under the vault knowledge base.
2. MBAI reads the vault routing rules, checks for an existing note with that video ID, retrieves the complete caption track, and writes one routed Markdown note.
3. Caption timestamps are validated for identity, ordering, start, duration bounds, and segment count. A caption is not required at an exact final second.
4. Success must name the concrete note path after atomic write and exact read-back. Transcript retrieval or a temporary file alone is not completion.

## Cancel a slow request and inspect safe live activity — ADA-077

- While MBAI is working, select **Live log** to see timestamped stages such as request received, selected agent started, still working, stopped, or finished. The drawer shows controlled status text only; it does not expose prompts, provider responses, commands, credentials, email, or vault content.
- Select **Cancel** when a request is taking too long. MBAI stops the active equipped-agent process tree, marks that request cancelled, discards any late response, restores the normal orb avatar, and makes the message field usable again.
- To close a stuck application, ask naturally—for example, `close the stuck MS Edge browser window`. MBAI resolves the user-facing name to the running executable internally. Review and approve the target-specific unsaved-work warning; you do not need to find a PID, HWND, or executable name.

## Use tools in the selected full agent profile — ADA-074/075

- On startup, MBAI loads the saved provider before enabling the message field. In Settings, Codex, Claude, and Qwen use their corresponding full Hermes profiles; LM Studio and OpenAI-compatible HTTP endpoints do not inherit those agent capabilities.
- Ask naturally for information from the vault or email. Ordinary questions pass directly to the selected equipped profile, which performs configured read/search work and returns the answer through MBAI. Email/inbox/Gmail/Outlook/vault/Obsidian requests cannot be routed to Computer Use.
- Connected access is not blanket authority. Reading/searching/drafting and sending/deleting are distinct. MBAI never copies CLI credentials into its own settings, prompts, or logs, and does not bypass the CLI's permission policy.

## Continuing in the application from the previous turn — ADA-073

- You may say `Open or foreground Notepad++`, approve it, and then ask `Show me how to open a file`. MBAI retains the verified prepared application for that follow-up and does not substitute Orca, Explorer, or another newly active window.
- You may also ask in one sentence: `Open Notepad++ or bring it to the foreground and then show me how to open a file`. MBAI presents one bounded demonstration approval.
- After approval, MBAI visibly moves through **File → Open** in Notepad++, verifies the resulting Open dialog belongs to that same Notepad++ process, and stops without choosing a file. Conversation context is bounded to eight messages, remains in memory only, and resets when MBAI exits.

## Visible request progress — ADA-072

- When you submit a new question or instruction, the previous card disappears immediately. A blank card body means MBAI is processing the new request; the header reports the active provider stage and the composer remains disabled until that stage ends.
- The orb uses a bright-green question mark only while work is active. This is intentionally distinct from the configured blue bot face. When processing succeeds or fails, MBAI restores the selected bot avatar.

## Selected-AI tool use and closing named applications — ADA-071

- Ask naturally. MBAI first gives the selected AI a typed catalog of bounded local capabilities; the AI may answer, call a read-only tool, inspect its observation, and continue. No special sentence opening is required.
- Direct local fact requests run automatically. They currently include active-window metadata, named-process status, running services, top memory applications, largest-file metadata, and local date/time.
- To close applications, say for example `close all Notepad++ applications`. Confirm the card names Notepad++, says all matching processes, warns that unsaved work may be lost, and offers one allow-once action. Nothing closes until that action is selected.
- After approval, MBAI runs the named-process operation in the background and rechecks the process list. It reports success only when no matching process remains. It does not use Explorer, a file picker, visible click automation, or whichever window happens to be active.
- Protected Windows processes, Explorer, and MBAI itself are blocked from this generic termination capability. The in-panel approval remains a UX consent boundary; the independent broker/capability-token milestone is still future work.

## Running executable questions — ADA-070

- Direct questions such as `is orca.exe running?` and `is the notepad++.exe process running?` use local process metadata. Executable periods and an optional `process` suffix are supported.

## Largest files under a local folder — ADA-069

- Ask directly, for example: `get me a list of the 5 largest files under D:\Source`.
- MBAI reads filesystem metadata only. If the exact directory is absent and exactly one sibling directory is one edit away, it discloses that correction and proceeds; otherwise it reports the grounded path error without silently choosing another root.

## Natural resource-question phrasing — ADA-068

- Ranked memory/resource questions do not require a special opening. `Can you give me...`, `please give me...`, `tell me...`, `I want...`, and equivalent wording produce the same measured local answer.
- Numbers may be digits or words from one through ten. Explicit **how/show me how/teach/walk me through** wording remains explanatory.

## Selected model versus equipped agent — ADA-067

- The selected LLM supplies reasoning and ordinary answers. A selected CLI runtime also retains its configured tools; an HTTP model endpoint does not. MBAI supplies only its separate host capabilities and execution safeguards rather than duplicating provider-owned vault/email integrations.
- Direct system-state wording is resolved through the local-answer capability plan before provider prose. `what 10 apps take up the most resources on this machine` returns ten measured entries. Because **resources** has no single Windows unit, MBAI explicitly interprets it as current aggregated working-set memory rather than refusing or inventing a combined score.
- Asking **how** remains explanatory; it does not run the local query. Read-only answers execute without action approval. Mutation and visible control retain scoped approval and verification.

## Answer, explain, show, and do routing — ADA-066

- A direct factual question about this computer means **perform the necessary read-only local work and answer**. MyBuddy may use a native API, code, or a bounded script; it must not replace the answer with instructions merely because the selected model lacks ambient machine state.
- **What application is taking up the most memory?** returns one measured application. **What are the 5 applications that use the most memory?** returns five. MyBuddy aggregates working-set memory across processes with the same executable, supports top-N from 1 through 10, and answers from local process metadata without screenshots or Task Manager instructions.
- **How do I…?** asks for an explanation. **Show me / teach me / walk me through…** asks for a visible Normal/Slow demonstration. **Do it for me…** asks for execution: MyBuddy uses the most reliable API/code path first, then appropriately scoped AutoHotkey or verified Computer Use when visible clicks are necessary.

## Windows services, Notepad++ actions, and connected provider tools — ADA-065

- Ask **what services are currently running?** or **what windows services are currently running on this machine**. MyBuddy uses the Windows Service Control Manager locally, reports the total running-service count, and displays at most 40 sorted display names. It does not mistake “services” for an application name, expose service configuration/secrets, or send the inventory to the selected model.
- Ask **open Notepad++** or **bring Notepad++ to the foreground**. Review the dedicated Notepad++ approval card, then choose the one-time action. MyBuddy restores or starts only Notepad++, verifies its exact visible main window is foreground, and ends scope; Orca or Explorer is never borrowed as the target.
- Ask **open Notepad++, open a new file and create a story that is 500 words or less**. The selected provider generates story text only. MyBuddy rejects empty, over-500-word, control-character, or over-20,000-character output. After the one-time approval, it writes a uniquely named draft in the Windows temporary folder, reads the file back exactly, opens that verified draft in a dedicated Notepad++ instance, and verifies the tab/window title. This avoids clipboard, synthetic typing, and unsupported cross-process Scintilla messages.
- Claude Code loads user settings/MCP under `dontAsk` and no-session persistence, without restricted or safe mode. Codex receives the exact user question and inherits its normal user configuration, rules, permissions, plugins, and CLI-visible MCP tools. Qwen uses the installed `qwen` CLI, and Hermes loads its configured tools/rules. MBAI must report only capabilities actually visible in the selected runtime and must not infer them from a model name.
- Drafting or reading through a connected service follows the selected provider's existing grants. Sending, deleting, purchasing, security changes, permission prompts, and credential handling remain consequential operations requiring their own explicit scope; a connection is capability availability, not blanket mutation authority.
- Startup provider health is advisory for autonomous suggestions. Explicit user questions and approved actions still attempt the selected provider and report the actual result; a stale startup probe cannot permanently disable the assistant.

## Check the canonical vault schedule — ADA-063

1. Ask MyBuddy explicitly, for example: **Check my schedule in the vault** or **What appointments are in my Obsidian calendar?**
2. The narrow host adapter reads only `%OBSIDIAN_VAULT_PATH%\010_Personal\001_Schedule\001_Schedule.md`, with a 64 KiB limit. This does not add, remove, or duplicate vault tools already configured in the selected CLI.
3. The selected provider receives the question plus that one schedule note as untrusted reference data. If a CLI/cloud provider is selected, this explicit request sends that bounded note to the selected provider under the existing provider privacy boundary.
4. The answer must say it is based on the vault schedule only. The vault note itself warns that Google Calendar, Apple Calendar, and Apple Reminders do not sync; MyBuddy must not claim those live systems were checked.
5. Ordinary questions do not read the vault. If `OBSIDIAN_VAULT_PATH` is unavailable, the schedule note is missing, or it exceeds the limit, MyBuddy fails rather than searching another folder.

## Launch Word from Start-menu wording — ADA-062

1. Ask MyBuddy: **click on the start menu icon and run word**.
2. Confirm the approval card says **Allow once and open Microsoft Word**. It must not name Orca or offer current-application Computer Use.
3. Select the one-time approval. MyBuddy starts or restores only Microsoft Word, verifies a visible native Word main window, and ends scope.
4. Start-menu wording expresses the launch goal; MyBuddy deliberately uses its bounded direct Word launcher instead of a fragile shell-search walkthrough. It does not type into Start, open a document, or perform another Word action.


## Visible “Show me” / “Teach me” demonstrations — ADA-061

1. Leave the intended application visible or minimized as the last privacy-approved non-MyBuddy window, then ask **Show me how to…**, **Teach me how to…**, or **Walk me through…**.
2. MyBuddy inspects current accessibility state, pins the exact PID/HWND/title/goal when it renders the guidance card, and temporarily changes the orb to a blue question-mark face while planning. It restores the selected profile image on success, failure, or cancellation.
3. Review the generated state-grounded steps, then choose **Normal** or **Slow**. Selecting a speed is the explicit start action for that one scoped demonstration; **Cancel** performs no action.
4. MyBuddy revalidates the pinned target before every step. AutoHotkey v2 visibly moves the real cursor and performs the fixed click/type action generated by MyBuddy. The model selects only current opaque element tokens and approved action data—it never writes AutoHotkey source.
5. The demonstration deliberately moves the cursor so the user can watch, but it never calls `BlockInput`, clips the cursor, installs a keyboard/mouse hook, or suppresses physical input. Open MyBuddy from the orb and choose **Stop demonstration** to cancel the current short-lived AutoHotkey step and end the scope.
6. Text typing is allowed only into a current enabled Edit/ComboBox token and only when the exact text appears verbatim in the approved goal. Credentials, authentication, payments, permission dialogs, destructive actions, and model-invented text remain blocked.
7. MyBuddy takes a fresh accessibility snapshot after every step and stops on changed/private targets, stale controls, repeated no progress, ambiguity, cancellation, eight steps, or 120 seconds. Standard file-picker completion requires semantic `File name` plus `Open` controls; reaching the picker does not select a file.

Live acceptance used Word PID 49884/HWND 590358 at Normal speed. MyBuddy dynamically navigated **File → Open → Browse**, verified the standard Open picker, left the filename empty, selected no file, and recorded `autohotkey-demo-result` with `verified: true`. AutoHotkey v2.0.26 was already installed, so no install or update was needed.

Automatic terminal-command execution is a separate authority from GUI demonstration and is not implied by Normal/Slow. It remains pending the exact requested command and the user's direct-vs-confirm-before-run authorization policy.

## Panel focus, CLI providers, and readable Settings — ADA-057–059

1. If the MyBuddy panel is hidden or minimized, click MBAI once to show and activate it.
2. If the panel is already open behind another application, click MBAI once. The same panel and its current card move to the foreground; it must not close or replace the conversation. A click while the panel is already foreground remains the explicit hide toggle.
3. Open **Settings → Model provider**. MyBuddy checks the real CLI command names on `PATH` and annotates Codex, Claude Code, Continue, Hermes, OpenCode, and Antigravity as detected—with version when available—or not detected. Missing CLI routes cannot be selected.
4. Select **Codex CLI**, then choose **Save and test**. This changes only the explicit provider; there is no automatic fallback to another local or cloud model. CLI prompts use piped input and no visible terminal window.
5. Settings labels, values, placeholders, options, disabled controls, and focus outlines use separate high-contrast dark/light palettes. Text must remain readable in either Windows color mode.

## Periodic black-screen investigation — ADA-060

The recurring five-minute black flash was the interactive PowerShell action for **LM Studio - Ensure Local Models**, not MyBuddy or model loading. The task now launches `run-ensure-local-models-no-console.exe`, a fixed-purpose Windows GUI-subsystem helper that starts only the existing persistence script with `CREATE_NO_WINDOW` and returns its exit code. The schedule, health checks, API, `instruct` alias, and `autocomplete` alias are unchanged.

Manual verification:

1. Open **Task Scheduler** and inspect **LM Studio - Ensure Local Models**. Its action must be `%USERPROFILE%\.lmstudio\startup\run-ensure-local-models-no-console.exe`, and its five-minute repetition must remain enabled.
2. Wait across a five-minute boundary. No PowerShell or Windows Terminal window should appear.
3. Run `%USERPROFILE%\.lmstudio\bin\lms.exe ps`. `instruct` and `autocomplete` must remain loaded with their existing context lengths.
4. For rollback, import `%USERPROFILE%\.lmstudio\startup\backups\LM Studio - Ensure Local Models.before-no-console.xml`. Rollback restores the old interactive PowerShell action and may restore the flash, so use it only if the helper fails.

## Show-how guidance reliability — ADA-056

After naming or opening an application, ask **Show me how to open a file**. MyBuddy resolves the intended application from the current request or bounded conversation rather than borrowing whichever window happens to be foreground. It inspects that application's visible accessibility controls locally, displays ordinary numbered click instructions, and separately asks whether Computer Use should perform the task. If state inspection or structured guidance fails, MyBuddy shows a dedicated truthful guidance-unavailable card; it must never label this request as a generic Qwen question or claim that no screen context was involved.

## Bring/focus an application — ADA-055

1. Leave the intended application as the last privacy-approved non-MyBuddy window, then ask **Bring it to the foreground**, **Bring this app to the front**, **Focus this window**, or **Activate the application**.
2. MyBuddy treats this as an action request, not an ordinary Qwen question. It displays the exact goal and one-time Computer Use approval rather than claiming it lacks desktop access.
3. After approval, MyBuddy revalidates the exact PID/HWND/title/privacy target and permits the planner's window-level `bring_to_front` action only because the approved goal explicitly requests foreground/focus/activation.
4. Success requires cua-driver's returned `now_fg_hwnd`—integer or hexadecimal string—to equal the approved HWND. Pure foreground goals end immediately after that read-back. Combined goals continue through the normal bounded planner.

## “Show me how” and app-general Computer Use — ADA-053/054

1. Name the application in the request, or open/name it in the preceding turn, then ask **Show me how to open a file**.
2. MyBuddy inspects that exact app's current accessibility controls and asks local Qwen for ordinary click instructions grounded in those controls. The walkthrough is not hard-coded and does not use PowerShell, commands, shortcuts, coordinates, or code.
3. MyBuddy separately asks **Would you like me to do those clicks for you using Computer Use?** Nothing is controlled merely because you asked to be shown.
4. Choose **No, I'll do it** to return without action. Choose **Yes — use Computer Use** only if you approve the displayed goal against the displayed app for this run.
5. After Yes, MyBuddy resolves or launches the named application, binds its origin PID, repeatedly inspects the current same-process workflow HWND, lets the selected AI choose one currently visible enabled semantic control, validates the returned opaque element token, invokes that control, and takes a fresh snapshot. It stops when visible state proves the goal, after eight actions/45 seconds, or immediately on changed/private/sensitive/destructive/ambiguous state. The current executor clicks semantic accessibility controls only; typing, secrets, authentication, payments, permission prompts, and file selection require separate future permission classes.
6. This is app-general behavior: there is no Word, Notepad++, Paint, **File → Open**, or **Browse** walkthrough in the executor. An app that exposes usable accessibility controls can participate; custom canvases and inaccessible controls stop safely rather than triggering a pixel/script fallback.

## Analyze the current terminal or window — ADA-052

- Leave the terminal/editor containing the error as the last active non-MyBuddy window, then open MyBuddy and ask explicitly, for example: **Read the error in my terminal and help me fix the command**.
- MyBuddy reads only visible Windows UI Automation text from that exact previously observed window. It does not take a desktop screenshot, read hidden scrollback, capture keystrokes/clipboard, or execute the proposed command.
- Metadata privacy filtering runs before capture. Captured text is bounded to 12,000 characters, terminal cell padding is removed, common secrets are redacted before the local model call, and raw text is not written to history or diagnostics.
- A relevant import/script/error question that does not explicitly request reading can show **Analyze current terminal**; pressing it is the explicit one-time read intent.
- The answer footer says **Answered by the selected model provider · bounded visible-window accessibility text was included**. If a required file path is absent from the visible text, MyBuddy must request it or offer a check command rather than inventing a path.
- Reading a window is not permission to read a file or execute a command. Paste or select additional context separately when needed, and review any proposed command before running it.

## Local desktop-state answers — ADA-064

- Ask **what do you see on the screen** to get the last privacy-approved non-MyBuddy foreground application and window title that the observer recorded. This is active-window metadata only; MyBuddy does not inspect screen pixels or imply that it did.
- Ask **is Notepad++ running** (the reported `runing` typo is also accepted) to check the local Windows process snapshot. MyBuddy returns only whether the named application matched; it does not open Task Manager, call the selected model provider, start a shell, or expose the full process list.
- Both cards identify their source as **Answered in-process from local desktop metadata · no screenshot or screen pixels**. If no approved foreground metadata exists, the screen-state question fails closed rather than asking the model to guess.

## No-popup answers and provider helpers

- Direct clock questions such as **what time is it** are answered inside MyBuddy-AI with the runtime's local date/time APIs. They do not call Qwen, PowerShell, a shell script, `wscript.exe`, or another helper process.
- The answer card identifies this truthfully as **Answered in-process · no helper process or screen content**.
- HTTP providers remain in-process network calls. Optional CLI providers run without opening a terminal: Windows suppresses console allocation; macOS/Linux invoke the selected executable directly with piped input/output.

## Current 0.1.5 reliability and customization behavior

- A stationary single click on MyBuddy uses authoritative native visibility and focus: hidden/minimized opens or restores; visible in the background moves to the foreground without losing content; visible and already focused hides. The panel has no Windows title bar, rectangular background frame, or neon top strip. Its native hit region contains only the rounded MBAI bubble and three thought circles. Drag it by its custom MyBuddy header; use the in-panel **—** control to minimize.
- Ordinary application visual workflows are allow-once and use `desktop.visual_workflow`; they cannot be persisted as broad grants. Retired Word/Notepad++ launch and File/Open grants are ignored. Generated-story insertion is also one-time.
- The orb defaults to **Friendly Blue Orb Bot**. Open **Settings** from the panel to choose any of the 78 locally bundled profile images. Selection is stored locally; images are lazy-loaded and decoded locally.
- Right-click the bounded orb for **Close MyBuddy-AI** followed by **Minimize orb to system tray**. Tray **Show Orb** restores a minimized orb.
- A physical right-click on the caption-hit-tested orb is handled directly on button release. **Close MyBuddy-AI** exits the exact agent process; **Minimize orb to system tray** hides only MBAI and leaves the agent available from tray **Show Orb**.
- The in-panel control is **— Minimize to orb**. It hides the native panel but leaves the orb, tray, observer, and process running. The native Windows title bar has been removed; Windows hiding still uses direct HWND visibility read-back so a false-success hide cannot leave a black shell.
- Explicit visual action wording offers one-time generic Computer Use with the named application and complete bounded goal; no app-specific adapter is required. It never starts merely from the request text, and app-general goals cannot be persisted.
- **Settings → Model provider** supports LM Studio, OpenAI-compatible HTTP, Codex CLI, Claude Code CLI, Continue CLI, Hermes CLI, OpenCode CLI, and Antigravity CLI. CLI availability/version is detected from `PATH`; missing routes are disabled. OpenAI-compatible keys are write-only in the UI and stored in Windows Credential Manager. LM Studio remains the built-in local-first default (`instruct` chat, `autocomplete` ambient analysis), while the current workstation trial explicitly selects Codex.

If LM Studio starts without models, run the existing recovery script:

```powershell
& "$HOME\.lmstudio\startup\ensure-local-models.ps1"
lms ps
Invoke-RestMethod http://127.0.0.1:1234/v1/models
```

The scheduled task **LM Studio - Ensure Local Models** now runs after logon and every five minutes. It starts the server and restores both aliases only when missing. MyBuddy-AI does not unload LM Studio models.

## Windows prerequisites

Install these manually if they are not already available:

1. Node.js LTS and npm.
2. Rust through rustup using the stable MSVC toolchain.
3. Visual Studio 2022 Build Tools with **Desktop development with C++**.
4. Microsoft Edge WebView2 Evergreen Runtime.
5. LM Studio with its local server listening on `http://127.0.0.1:1234`.

Confirm from a new terminal:

```powershell
node --version
npm --version
rustc --version
cargo --version
```

## Install project dependencies

```powershell
cd D:\Source\ambient-desktop-agent
$env:NODE_ENV = "development"
npm install --include=dev
```

`NODE_ENV` is set explicitly because this workstation currently exports it as `production`, which otherwise omits Vitest and other development dependencies.

## Confirm local models

```powershell
lms ps
Invoke-RestMethod http://127.0.0.1:1234/v1/models
```

The mockup uses `autocomplete` (Qwen2.5 Coder 3B) for fast structured ambient analysis and `instruct` (Qwen3.6 35B) for ordinary chat questions. LM Studio chat questions use `/v1/responses` with per-request reasoning effort `none`, preventing the concise answer budget from being consumed entirely by hidden reasoning.

## Verify

```powershell
npm test
npm run build
cargo test --manifest-path src-tauri\Cargo.toml
cargo check --manifest-path src-tauri\Cargo.toml
```

## Run the development mockup

> **Safety:** Version 0.1.0 is retired. Do not run an old 0.1.0 installer or executable. Version 0.1.1 was temporary tray-hidden containment. MyBuddy-AI 0.1.5 uses a bounded draggable native orb and a separate collision-aware suggestion window. Development launch is interactive and must not be left unattended on a working desktop.

```powershell
npm run tauri dev
```

Expected behavior:

1. A native circular orb with the Friendly Blue Orb Bot image appears at startup. The original cyan/violet/pink bot-face renderer remains the fail-safe fallback. It is always on top, nonactivating, bounded to the monitor work area, and capped at 192 physical pixels. Hold the left mouse button on the visible orb, move it, and release; it remains at the released, work-area-clamped position for that run.
2. The orb's circular Win32 region means there is no rectangular transparent WebView area outside it to intercept pointer input.
3. A notification-area icon provides Show, Show Orb, Analyze current work, Pause/Resume, and Quit. Orb right-click provides Close MyBuddy-AI and Minimize orb to system tray in that order.
4. Clicking without dragging the orb toggles the native-shaped MBAI thought-bubble panel: hidden/minimized opens or restores it; visible hides it. Choosing tray **Show** explicitly opens it. After an orb drag, a visible panel follows on release and mirrors its thought trail when it must sit on the other side of the orb.
5. The toggle reads native visible/minimized state before acting; it does not rely on stale frontend state.
6. A detected candidate automatically displays the separate native-shaped, undecorated, non-topmost thought-bubble window without activating it or stealing keyboard focus. Only the opaque bubble body and three dots are part of its native region.
7. Type an ordinary question in the footer and press Enter or **Send**. It goes only to local Qwen. If LM Studio is offline, the card says so and no cloud fallback occurs.
8. Ordinary named-application visual requests are planned through `desktop.visual_workflow` and require one-time approval. The executor is app-general, process-bound, and state-verified; unknown or sensitive actions stop safely instead of requesting a new app-specific executor.
9. **Analyze current work** sends only the active application name and window title to local LM Studio.
10. **Show mock suggestion** exercises the full card interaction without invoking a model.
11. **Pause** stops observation and hides the suggestion window. The bounded status orb remains available; Resume does not reopen a suggestion.
12. **— Minimize to orb** hides only the thought-bubble window. The orb, tray icon, observer, and agent process remain running. Use orb **Close MyBuddy-AI**, tray **Quit**, or the scripted `Stop` action to exit.

Stop the development process with `Ctrl+C` in its terminal.

Emergency stop from another PowerShell terminal:

```powershell
.\scripts\ambient-agent.ps1 -Action Stop
```

## Guarded desktop smoke test

Use this before any longer manual run:

```powershell
.\scripts\guarded-smoke-test.ps1 -TimeoutSeconds 30
# Interactive drag acceptance (drag the visible orb before the deadline):
.\scripts\guarded-smoke-test.ps1 -TimeoutSeconds 90 -RequireOrbDrag
```

The external PowerShell watchdog launches the release executable with test-only automatic-suggestion, close-suggestion, and minimize/restore triggers. It requires bounded circular orb diagnostics, verifies the panel's physical outer rectangle does not intersect the orb, checks automatic no-activation display, X hide-only lifecycle, and minimized restoration, then forcibly terminates the exact process at the deadline. `-RequireOrbDrag` additionally fails unless a real press-drag-release produces a clamped `native-orb-moved` record.

## Run the 15-second fake-toast boundary test

```powershell
.\scripts\show-fake-toast.ps1 -Seconds 15
```

This nonactivating WPF test surface displays an advice-worthy message for 15 seconds without taking focus. MyBuddy-AI 0.1.5 will **not** read or advise from that message because it observes active process/window-title metadata only. This is an honest boundary test, not a detector-success test.

## Read diagnostic logs

```powershell
.\scripts\ambient-agent.ps1 -Action Logs
# Direct path:
Get-Content "$env:LOCALAPPDATA\com.kgkz.ambientagent\logs\ambient-agent.jsonl" -Tail 100
```

The native JSONL log is append-only and strips fields named `title`, `windowTitle`, `text`, `content`, `password`, `secret`, and `token`. Version 0.1.0 only used WebView local storage; the recovered incident record contained `pause_toggle` and `paused` at 2026-08-28 08:33:03 EDT.

## Build a Windows installer

```powershell
npm run tauri build
```

Artifacts are created under `src-tauri\target\release\bundle`.

## Install the shared MBAI harness

The canonical skills, workflows, and cron definitions are under repository `harness/` and are included in native application bundles. They contain no credentials or live scheduler state.

```powershell
python .\harness\scripts\install_harness.py
python .\harness\scripts\sync_cron.py
```

The first command configures and verifies the default/Codex/Claude/Qwen Hermes profiles against the current harness path. The second validates scheduled-job definitions without creating them. Use `--apply` only when the jobs in `harness\cron\jobs.json` have been explicitly approved.

## macOS developer path

The conversation core and equipped-agent harness are designed to be portable, but native feature parity is incomplete. The macOS override uses an opaque panel because the shaped transparent Windows surface is not portable. On a Mac:

```bash
xcode-select --install
# Install Node LTS and rustup, then:
cd /path/to/ambient-desktop-agent
npm install
python3 harness/scripts/install_harness.py
npm test
npm run tauri dev
```

macOS requires user-granted **Screen Recording** permission before window titles are available. The native orb, Windows process/service/memory adapters, exact visible-window text, AutoHotkey demonstrations, named-process termination, and MBAI's own API-key storage are not implemented on macOS. See `MACOS-COMPATIBILITY.md` for the exact matrix and release gate. Do not bypass Screen Recording, Accessibility, signing, or credential-store requirements.

## Not enabled

- Launch at sign-in.
- Continuous screenshots.
- Notification/toast payload capture or OCR.
- General-purpose keyboard or mouse control. Version 0.1.5 has only native orb dragging and one fixed Notepad++ `File > Open` command.
- Buzz transport.
- Cloud model escalation.
- macOS packaging validation.
