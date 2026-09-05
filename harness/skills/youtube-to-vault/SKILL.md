---
name: youtube-to-vault
description: Use when saving YouTube transcripts into the vault.
version: 1.0.0
license: MIT
platforms: [linux, macos, windows]
metadata:
  hermes:
    tags: [YouTube, Obsidian, Vault, Transcript, KnowledgeBase]
    related_skills: [master-vault, obsidian, youtube-content]
---

# YouTube to Vault

Capture a complete timestamped YouTube caption transcript as a durable Obsidian note. This workflow is designed to finish the requested vault write in one deterministic operation after routing is resolved.

## Required workflow

1. Load `master-vault`, `obsidian`, and `youtube-content`.
2. Resolve `OBSIDIAN_VAULT_PATH`, then read root `AGENTS.md`, root `VAULT_LOG.md`, and the relevant domain README before selecting a destination.
3. Search the selected topic folder and the vault for the video ID to avoid duplicate notes.
4. Choose a vault-relative `.md` destination. Do not pass an absolute destination and do not guess across domains.
5. Run the bundled script with that destination:

```bash
uv run --with youtube-transcript-api python "$MBAI_HARNESS_PATH/skills/youtube-to-vault/scripts/capture_youtube_to_vault.py" "YOUTUBE_URL" --destination "010_Personal/035_Knowledge_Base/Topic/Title.md"
```

If `MBAI_HARNESS_PATH` is unavailable in a source checkout, resolve the script relative to the repository `harness/` directory. On Windows, native Python accepts `C:/...` paths; on macOS/Linux, use the normal POSIX path.

6. Treat only JSON output with `status: saved-and-verified` as completion. Read back the exact destination and confirm the source video ID, title, transcript heading, segment count, and final timestamp are present before reporting success.
7. Report the concrete saved path. Do not claim success after transcript retrieval alone.

## Validation policy

- Validate the 11-character video ID, nonempty timestamped captions, segment count, monotonic timestamps, a start near the beginning, and that the final caption does not begin after the declared duration.
- Never require a caption at an exact wall-clock second. Caption cues are sparse and may land one or more seconds before the media duration.
- The helper writes through a same-directory temporary file, atomically replaces the destination, and reads the bytes back exactly.
- A `t=` URL offset does not truncate the transcript; preserve the complete caption track and canonicalize the source URL.
- If fetching succeeds but saving fails, retain the fetched JSON, report the actual blocker, and retry the write while the request is active. Do not stop at a recoverable assertion.

## Existing transcript JSON

For a previously fetched JSON artifact containing `video_id`, `segment_count`, `duration`, and `timestamped_text`, add:

```text
--transcript-json /path/to/transcript.json --title "Title" --author "Channel"
```

This avoids a second network fetch while applying the same structural validation, atomic write, and read-back verification.
