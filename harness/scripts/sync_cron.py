from __future__ import annotations

import argparse
import json
import subprocess
from pathlib import Path
from typing import Any

DEFAULT_PROFILES = ("hermescodex", "hermesclaude", "hermesqwen")


def validate_job(job: Any) -> dict[str, Any]:
    if not isinstance(job, dict):
        raise ValueError("Every cron job must be an object.")
    required = ("name", "schedule", "prompt")
    missing = [field for field in required if not str(job.get(field, "")).strip()]
    if missing:
        raise ValueError(f"Cron job is missing required fields: {', '.join(missing)}")
    return job


def profile_command(profile: str) -> list[str]:
    return ["hermes"] if profile == "default" else ["hermes", "-p", profile]


def install_job(profile: str, job: dict[str, Any], apply: bool) -> None:
    name = str(job["name"])
    if not apply:
        print(f"PLAN {profile}: {name}")
        return
    existing = subprocess.run(
        [*profile_command(profile), "cron", "list", "--all"],
        check=True,
        capture_output=True,
        text=True,
    ).stdout
    if name in existing:
        print(f"SKIP {profile}: {name} already exists")
        return
    command = [
        *profile_command(profile),
        "cron",
        "create",
        str(job["schedule"]),
        str(job["prompt"]),
        "--name",
        name,
        "--deliver",
        str(job.get("deliver", "local")),
    ]
    for skill in job.get("skills", []):
        command.extend(["--skill", str(skill)])
    if job.get("continuity") is True:
        command.append("--continuity")
    subprocess.run(command, check=True)
    print(f"CREATE {profile}: {name}")


def main() -> int:
    parser = argparse.ArgumentParser(description="Validate or install MBAI cron definitions")
    parser.add_argument("--profile", action="append", choices=("default", *DEFAULT_PROFILES))
    parser.add_argument("--apply", action="store_true", help="Create missing jobs; default is plan-only")
    args = parser.parse_args()

    path = Path(__file__).resolve().parents[1] / "cron" / "jobs.json"
    document = json.loads(path.read_text(encoding="utf-8"))
    if document.get("schemaVersion") != 1 or not isinstance(document.get("jobs"), list):
        raise ValueError("cron/jobs.json must use schemaVersion 1 with a jobs array.")
    jobs = [validate_job(job) for job in document["jobs"]]
    profiles = args.profile or DEFAULT_PROFILES
    for profile in profiles:
        for job in jobs:
            install_job(profile, job, args.apply)
    print(f"Validated {len(jobs)} MBAI cron definition(s) for {len(profiles)} profile(s).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
