---
name: master-vault
description: Use before note work in the configured Obsidian vault.
version: 2.0.0
license: MIT
platforms: [linux, macos, windows]
metadata:
  hermes:
    tags: [Obsidian, Vault, Notes, Routing, KnowledgeBase]
    related_skills: [obsidian]
---

# Master Vault

The vault root is supplied by the machine-local `OBSIDIAN_VAULT_PATH` environment variable. Resolve its concrete absolute path before calling file tools; file tools do not expand shell variables.

Use the `obsidian` skill for reading, searching, and writing mechanics. This skill governs routing and boundaries.

## Authority order

1. `AGENTS.md` at the configured vault root — domain and placement rules.
2. `VAULT_LOG.md` at the configured vault root — destinations, routing tables, and change history.
3. Domain `README.md` files — local folder legends.

Read the first two before placing or moving a note. Never infer a destination when those records can decide it.

## Domain separation

Keep Personal, Projects, and MyMark Fabrication material in their respective top-level domains. Root `999_System` is shared vault mechanics, not a fourth content domain. Never move material across domains based on inference. Route uncertain material to the applicable domain's `999_System/Needs_Review` queue.

## Searching

1. Resolve `OBSIDIAN_VAULT_PATH`.
2. Read root `AGENTS.md` and `VAULT_LOG.md`.
3. Select the relevant domain and search its README and named folders first.
4. Widen to the domain, then the whole vault, only when scoped searches are insufficient.
5. Return the requested facts without exposing unrelated private content.

## Writing

- Follow the current routing table rather than cached paths in this skill.
- Use `[[Wikilink]]` syntax for related notes.
- Keep attachments beside their note in `Attachments`.
- Do not create a competing `.obsidian` directory.
- Preserve dated history; add superseding records rather than rewriting prior decisions.
- Add structural changes to the top of the `VAULT_LOG.md` Changes section and update affected routing/README records in the same operation.
- When the user explicitly requests a YouTube transcript in the vault, load `youtube-to-vault` and complete its atomic save-and-read-back workflow. Transcript retrieval alone is not completion.
- Validate timestamped media structurally. Never require a caption at an exact second; caption cue spacing is not a completeness invariant.
