# MBAI Harness

This directory is the portable, project-owned control plane shared by MyBuddy-AI and whichever equipped LLM is selected in the harness.

## Contents

- `skills/` — MBAI-specific Hermes skills available to Codex, Claude, Qwen, and the default Hermes profile, including atomic YouTube-to-vault capture.
- `workflows/catalog.json` — reusable intent-to-skill workflow definitions.
- `cron/jobs.json` — declarative scheduled-job definitions. Live scheduler state remains profile-local.
- `scripts/install_harness.py` — wires Hermes profiles to this harness through the documented `skills.external_dirs` setting.
- `scripts/sync_cron.py` — validates or installs declared cron jobs without storing scheduler state here.

## Boundaries

Portable definitions belong here. Credentials, tokens, provider settings, connection identifiers, session history, approval state, and live cron state do not. Those remain in each machine's Hermes profile and operating-system credential facilities.

`MBAI_HARNESS_PATH` points to this directory. MBAI sets it on every selected Hermes subprocess. Tauri packages this complete directory as `harness/` in application resources.

## Manual setup

1. Install and configure Hermes Agent and the desired provider profiles.
2. Set machine-local credentials using the provider's normal setup flow.
3. Run `python harness/scripts/install_harness.py` from the project checkout, or run the packaged copy from the installed resource directory.
4. Verify each configured profile reports `master-vault`, `composio-gmail`, and `youtube-to-vault` in `hermes ... skills list`.
5. Define portable jobs in `cron/jobs.json`; preview with `python harness/scripts/sync_cron.py`, then use `--apply` when ready.

## Automation setup

```text
python harness/scripts/install_harness.py
python harness/scripts/sync_cron.py
python harness/scripts/sync_cron.py --apply
```

Use repeatable `--profile NAME` arguments to limit either script to selected named profiles. Use `--profile default` for the default Hermes profile.

## AI-agent playbook

1. Read `manifest.json` before changing harness structure.
2. Keep every definition credential-free and path-portable.
3. Add or modify skills under `skills/`; never create a second MBAI skill root.
4. Add reusable task orchestration to `workflows/catalog.json`.
5. Add scheduled tasks to `cron/jobs.json`; apply them with `sync_cron.py` only after the user approves scheduling.
6. Verify discovery from every profile selected by MBAI.
7. Rebuild the Tauri packages so the updated harness ships with installers.
