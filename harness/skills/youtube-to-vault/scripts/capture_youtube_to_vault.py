#!/usr/bin/env python3
"""Fetch a YouTube caption transcript and atomically save it in an Obsidian vault."""

from __future__ import annotations

import argparse
import html
import json
import os
import re
import sys
import tempfile
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any

VIDEO_ID_RE = re.compile(r"^[A-Za-z0-9_-]{11}$")
TIMESTAMP_RE = re.compile(r"^(?:(\d+):)?(\d+):(\d{2})\s+(.+)$")


def fail(message: str) -> "NoReturn":
    raise ValueError(message)


def video_id_from(value: str) -> str:
    candidate = value.strip()
    if VIDEO_ID_RE.fullmatch(candidate):
        return candidate
    parsed = urllib.parse.urlparse(candidate)
    host = parsed.netloc.lower().split(":", 1)[0]
    if host in {"youtu.be", "www.youtu.be"}:
        candidate = parsed.path.strip("/").split("/", 1)[0]
    elif host.endswith("youtube.com"):
        if parsed.path == "/watch":
            candidate = urllib.parse.parse_qs(parsed.query).get("v", [""])[0]
        else:
            parts = [part for part in parsed.path.split("/") if part]
            candidate = parts[1] if len(parts) > 1 and parts[0] in {"embed", "shorts", "live"} else ""
    if not VIDEO_ID_RE.fullmatch(candidate):
        fail("a valid 11-character YouTube video ID is required")
    return candidate


def seconds_from_clock(value: str) -> int:
    parts = [int(part) for part in value.split(":")]
    if len(parts) == 2:
        return parts[0] * 60 + parts[1]
    if len(parts) == 3:
        return parts[0] * 3600 + parts[1] * 60 + parts[2]
    fail(f"invalid duration: {value}")


def clock_from_seconds(value: float) -> str:
    seconds = max(0, int(value))
    hours, remainder = divmod(seconds, 3600)
    minutes, seconds = divmod(remainder, 60)
    return f"{hours}:{minutes:02d}:{seconds:02d}" if hours else f"{minutes}:{seconds:02d}"


def parse_timestamped_text(text: str) -> list[tuple[int, str, str]]:
    parsed: list[tuple[int, str, str]] = []
    for line in text.strip().splitlines():
        match = TIMESTAMP_RE.match(line.strip())
        if not match:
            fail(f"invalid timestamped transcript line: {line[:80]}")
        hours = int(match.group(1) or 0)
        minutes = int(match.group(2))
        seconds = int(match.group(3))
        if seconds >= 60:
            fail(f"invalid timestamped transcript line: {line[:80]}")
        parsed.append((hours * 3600 + minutes * 60 + seconds, line.strip(), match.group(4)))
    if not parsed:
        fail("the transcript is empty")
    times = [entry[0] for entry in parsed]
    if times != sorted(times):
        fail("transcript timestamps are not monotonic")
    if times[0] > 10:
        fail("the transcript does not begin near the start of the video")
    return parsed


def load_fixture(path: Path) -> dict[str, Any]:
    data = json.loads(path.read_text(encoding="utf-8"))
    required = {"video_id", "segment_count", "duration", "timestamped_text"}
    missing = sorted(required.difference(data))
    if missing:
        fail(f"transcript JSON is missing: {', '.join(missing)}")
    return data


def fetch_transcript(video_id: str, languages: list[str]) -> dict[str, Any]:
    try:
        from youtube_transcript_api import YouTubeTranscriptApi
    except ImportError as exc:
        raise RuntimeError(
            "youtube-transcript-api is required; run with "
            "'uv run --with youtube-transcript-api python ...'"
        ) from exc

    fetched = YouTubeTranscriptApi().fetch(video_id, languages=languages)
    snippets = list(fetched)
    if not snippets:
        fail("YouTube returned an empty transcript")
    lines = [f"{clock_from_seconds(item.start)} {item.text.strip()}" for item in snippets]
    duration_seconds = max(item.start + item.duration for item in snippets)
    return {
        "video_id": video_id,
        "segment_count": len(snippets),
        "duration": clock_from_seconds(duration_seconds),
        "timestamped_text": "\n".join(lines),
    }


def fetch_metadata(video_id: str) -> dict[str, str]:
    url = "https://www.youtube.com/oembed?" + urllib.parse.urlencode(
        {"url": f"https://www.youtube.com/watch?v={video_id}", "format": "json"}
    )
    with urllib.request.urlopen(url, timeout=20) as response:
        data = json.load(response)
    return {
        "title": str(data.get("title") or "").strip(),
        "author": str(data.get("author_name") or "").strip(),
        "author_url": str(data.get("author_url") or "").strip(),
    }


def safe_output_path(vault_root: Path, destination: str) -> Path:
    root = vault_root.expanduser().resolve()
    output = (root / destination).resolve()
    try:
        output.relative_to(root)
    except ValueError:
        fail("destination must stay inside the vault root")
    if output.suffix.lower() != ".md":
        fail("destination must be a Markdown (.md) note")
    return output


def yaml_string(value: str) -> str:
    return json.dumps(value, ensure_ascii=False)


def render_note(
    data: dict[str, Any], title: str, author: str, author_url: str, source_url: str
) -> str:
    transcript = str(data["timestamped_text"]).strip()
    author_line = f"[{author}]({author_url})" if author and author_url else author or "Unknown"
    return f'''---
title: {yaml_string(title)}
source: {yaml_string(source_url)}
author: {yaml_string(author or "Unknown")}
video_id: {yaml_string(str(data["video_id"]))}
duration: {yaml_string(str(data["duration"]))}
type: youtube-transcript
tags:
  - youtube
  - transcript
---

# {title}

Source: [{title}]({source_url})  
Channel: {author_line}  
Duration: {data["duration"]}  
Transcript segments: {data["segment_count"]}

> [!note] Transcript provenance
> Timestamped transcript retrieved from YouTube captions. Captions may contain transcription errors. Timestamp completeness is validated structurally; captions are not required to land on an exact final second.

## Video

<iframe width="560" height="315" src="https://www.youtube.com/embed/{data["video_id"]}" title="{html.escape(title, quote=True)}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>

## Transcript

{transcript}
'''


def write_and_verify(output: Path, content: str, video_id: str, segment_count: int) -> None:
    output.parent.mkdir(parents=True, exist_ok=True)
    fd, temp_name = tempfile.mkstemp(prefix=f".{output.name}.", suffix=".tmp", dir=output.parent)
    try:
        with os.fdopen(fd, "w", encoding="utf-8", newline="\n") as handle:
            handle.write(content)
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(temp_name, output)
    finally:
        if os.path.exists(temp_name):
            os.unlink(temp_name)
    saved = output.read_text(encoding="utf-8")
    if saved != content:
        fail("saved note did not match the generated content")
    if f'video_id: "{video_id}"' not in saved or f"Transcript segments: {segment_count}" not in saved:
        fail("saved note failed identity verification")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("youtube_url_or_id")
    parser.add_argument("--vault-root", default=os.environ.get("OBSIDIAN_VAULT_PATH"))
    parser.add_argument("--destination", required=True, help="Vault-relative Markdown path chosen from vault routing rules")
    parser.add_argument("--transcript-json", type=Path, help="Use previously fetched transcript JSON")
    parser.add_argument("--title")
    parser.add_argument("--author")
    parser.add_argument("--author-url", default="")
    parser.add_argument("--language", default="en", help="Comma-separated caption language preference")
    args = parser.parse_args()

    try:
        if not args.vault_root:
            fail("OBSIDIAN_VAULT_PATH or --vault-root is required")
        video_id = video_id_from(args.youtube_url_or_id)
        data = load_fixture(args.transcript_json) if args.transcript_json else fetch_transcript(
            video_id, [item.strip() for item in args.language.split(",") if item.strip()]
        )
        if str(data["video_id"]) != video_id:
            fail("transcript video ID does not match the requested video")
        parsed = parse_timestamped_text(str(data["timestamped_text"]))
        segment_count = int(data["segment_count"])
        if segment_count != len(parsed):
            fail("segment count does not match timestamped transcript lines")
        duration_seconds = seconds_from_clock(str(data["duration"]))
        if parsed[-1][0] > duration_seconds + 2:
            fail("the final caption begins after the declared video duration")

        metadata = {"title": "", "author": "", "author_url": ""}
        if not args.title or not args.author:
            metadata = fetch_metadata(video_id)
        title = (args.title or metadata["title"]).strip()
        author = (args.author or metadata["author"]).strip()
        author_url = (args.author_url or metadata["author_url"]).strip()
        if not title:
            fail("video title is unavailable")

        source_url = f"https://www.youtube.com/watch?v={video_id}"
        output = safe_output_path(Path(args.vault_root), args.destination)
        content = render_note(data, title, author, author_url, source_url)
        write_and_verify(output, content, video_id, segment_count)
        print(json.dumps({
            "status": "saved-and-verified",
            "path": str(output),
            "videoId": video_id,
            "segmentCount": segment_count,
            "duration": str(data["duration"]),
            "lastTimestamp": parsed[-1][1].split(" ", 1)[0],
        }, ensure_ascii=False))
        return 0
    except Exception as exc:
        print(f"capture failed: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
