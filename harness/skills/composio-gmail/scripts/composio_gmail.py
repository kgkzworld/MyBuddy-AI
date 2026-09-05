from __future__ import annotations

import argparse
import importlib.util
import json
import os
import shlex
import shutil
import subprocess
import sys
from pathlib import Path
from typing import Any


def _candidate_pythons() -> list[list[str]]:
    candidates: list[list[str]] = []
    configured = os.environ.get("MBAI_COMPOSIO_PYTHON", "").strip()
    if configured:
        candidates.append(shlex.split(configured, posix=os.name != "nt"))
    if os.name == "nt":
        candidates.extend([["py", "-3.13"], ["py", "-3.12"], ["python"], ["python3"]])
    else:
        candidates.extend([["python3"], ["python"]])
    return candidates


def _ensure_composio_runtime() -> None:
    if importlib.util.find_spec("composio") is not None:
        return
    if os.environ.get("MBAI_COMPOSIO_REEXEC") == "1":
        raise RuntimeError("The selected Python interpreter does not have the Composio SDK installed.")

    for candidate in _candidate_pythons():
        if not candidate or shutil.which(candidate[0]) is None:
            continue
        probe = subprocess.run(
            [*candidate, "-c", "import composio"],
            stdin=subprocess.DEVNULL,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            check=False,
            timeout=15,
        )
        if probe.returncode != 0:
            continue
        environment = os.environ.copy()
        environment["MBAI_COMPOSIO_REEXEC"] = "1"
        completed = subprocess.run(
            [*candidate, str(Path(__file__).resolve()), *sys.argv[1:]],
            env=environment,
            check=False,
        )
        raise SystemExit(completed.returncode)

    raise RuntimeError(
        "The Composio SDK is not installed in an available Python interpreter. "
        "Configure MBAI_COMPOSIO_PYTHON or install Composio in the active Python environment."
    )


def _load_api_key() -> None:
    value = os.environ.get("COMPOSIO_API_KEY", "").strip()
    if not value and sys.platform == "win32":
        import winreg

        try:
            with winreg.OpenKey(winreg.HKEY_CURRENT_USER, "Environment") as key:
                value = str(winreg.QueryValueEx(key, "COMPOSIO_API_KEY")[0]).strip()
        except OSError:
            value = ""
    if not value:
        raise RuntimeError("The Composio credential is not configured in this machine's environment.")
    os.environ["COMPOSIO_API_KEY"] = value


def _model_dump(value: Any) -> dict[str, Any]:
    if isinstance(value, dict):
        return value
    method = getattr(value, "model_dump", None)
    if callable(method):
        dumped = method()
        if isinstance(dumped, dict):
            return dumped
    return {}


def _active_gmail_accounts(client: Any) -> list[dict[str, Any]]:
    response = client.connected_accounts.list()
    accounts = []
    for item in getattr(response, "items", []):
        data = _model_dump(item)
        toolkit = data.get("toolkit") or {}
        if (
            str(toolkit.get("slug", "")).lower() == "gmail"
            and str(data.get("status", "")).upper() == "ACTIVE"
            and not bool(data.get("is_disabled", False))
        ):
            accounts.append(data)
    return accounts


def _bounded(value: Any, limit: int) -> str:
    return str(value or "").replace("\x00", "").strip()[:limit]


def _message_metadata(message: dict[str, Any], account_index: int) -> dict[str, Any]:
    payload = message.get("payload") or {}
    headers = {
        str(header.get("name", "")).lower(): header.get("value", "")
        for header in payload.get("headers", [])
        if isinstance(header, dict)
    }
    return {
        "accountIndex": account_index,
        "id": _bounded(message.get("id"), 256),
        "threadId": _bounded(message.get("threadId") or message.get("thread_id"), 256),
        "from": _bounded(headers.get("from") or message.get("from"), 500),
        "subject": _bounded(headers.get("subject") or message.get("subject"), 500),
        "date": _bounded(headers.get("date") or message.get("messageTimestamp") or message.get("date"), 160),
        "snippet": _bounded(message.get("snippet"), 1_000),
        "labels": [
            _bounded(label, 100)
            for label in (message.get("labelIds") or message.get("labels") or [])[:30]
        ],
    }


def _messages_from_result(result: Any) -> list[dict[str, Any]]:
    data = _model_dump(result)
    nested = data.get("data") if isinstance(data.get("data"), dict) else data
    messages = nested.get("messages") or nested.get("items") or []
    return [message for message in messages if isinstance(message, dict)]


def main() -> int:
    parser = argparse.ArgumentParser(description="Bounded read-only Gmail access through existing Composio connections")
    subcommands = parser.add_subparsers(dest="command", required=True)
    subcommands.add_parser("status")
    search = subcommands.add_parser("search")
    search.add_argument("--query", required=True)
    search.add_argument("--max-results", type=int, default=25)
    args = parser.parse_args()

    if args.command == "search":
        query = args.query.strip()
        if not query or len(query) > 500:
            raise ValueError("query must contain 1 to 500 characters")
        max_results = max(1, min(50, args.max_results))

    _ensure_composio_runtime()
    _load_api_key()
    from composio import Composio

    client = Composio()
    accounts = _active_gmail_accounts(client)
    if args.command == "status":
        print(json.dumps({"configured": bool(accounts), "activeGmailConnections": len(accounts)}))
        return 0

    results: list[dict[str, Any]] = []
    failures: list[dict[str, Any]] = []
    for index, account in enumerate(accounts, start=1):
        try:
            response = client.tools.execute(
                slug="GMAIL_FETCH_EMAILS",
                arguments={"max_results": max_results, "query": query},
                connected_account_id=account["id"],
                user_id=account["user_id"],
                dangerously_skip_version_check=True,
            )
            results.extend(_message_metadata(message, index) for message in _messages_from_result(response))
        except Exception as error:
            failures.append({"accountIndex": index, "error": _bounded(error, 300)})

    truncated = len(results) > max_results
    output = {
        "activeAccounts": len(accounts),
        "accountsSearched": len(accounts),
        "query": query,
        "resultCount": min(len(results), max_results),
        "truncated": truncated,
        "failures": failures,
        "messages": results[:max_results],
    }
    print(json.dumps(output, ensure_ascii=False))
    return 0 if accounts and not failures else 2


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as error:
        print(json.dumps({"error": _bounded(error, 300)}))
        raise SystemExit(1)
