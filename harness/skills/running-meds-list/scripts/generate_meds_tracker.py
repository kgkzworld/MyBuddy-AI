#!/usr/bin/env python3
"""Generate medication tracker pages (HTML and Markdown) from meds-data.json."""

import argparse
import json
import os
import sys
from datetime import datetime, timezone
from string import Template

HTML_TEMPLATE = Template(r"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Medication Tracker — MyBuddy-AI</title>
<style>
  :root {
    --bg: #0d1322; --surface: #182238; --ink: #ecf3ff; --muted: #92a2bd;
    --cyan: #61e7ff; --green: #62e6a7; --amber: #ffc868; --red: #ff6b6b;
    --line: rgba(146,162,189,.18); --radius: 12px;
  }
  * { box-sizing: border-box; margin: 0; }
  body { font-family: Inter, 'Segoe UI', sans-serif; background: var(--bg); color: var(--ink); padding: 24px; min-height: 100vh; }
  h1 { font-size: 28px; margin-bottom: 8px; }
  .subtitle { color: var(--muted); font-size: 13px; margin-bottom: 28px; }
  .card { background: var(--surface); border: 1px solid var(--line); border-radius: var(--radius); padding: 20px; margin-bottom: 16px; }
  .card h2 { font-size: 18px; margin-bottom: 6px; }
  .card .dosage { color: var(--cyan); font-size: 14px; font-weight: 600; }
  .card .freq { color: var(--muted); font-size: 12px; margin-top: 4px; }
  .card .notes { color: var(--muted); font-size: 12px; margin-top: 8px; font-style: italic; }
  .schedule { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 12px; }
  .time-pill { padding: 5px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; border: 1px solid var(--line); }
  .time-pill.taken { background: rgba(98,230,167,.15); color: var(--green); border-color: rgba(98,230,167,.3); }
  .time-pill.due { background: rgba(255,200,104,.12); color: var(--amber); border-color: rgba(255,200,104,.3); }
  .time-pill.overdue { background: rgba(255,107,107,.12); color: var(--red); border-color: rgba(255,107,107,.3); }
  .time-pill.upcoming { background: rgba(97,231,255,.08); color: var(--cyan); border-color: rgba(97,231,255,.2); }
  .log-section { margin-top: 32px; }
  .log-section h2 { font-size: 20px; margin-bottom: 16px; }
  table { width: 100%; border-collapse: collapse; }
  th, td { text-align: left; padding: 10px 14px; border-bottom: 1px solid var(--line); font-size: 13px; }
  th { color: var(--muted); font-weight: 600; font-size: 11px; text-transform: uppercase; letter-spacing: .08em; }
  .status-taken { color: var(--green); }
  .empty { color: var(--muted); text-align: center; padding: 40px; }
  .footer { margin-top: 32px; color: var(--muted); font-size: 11px; text-align: center; }
  .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; margin-bottom: 24px; }
  .stat { background: var(--surface); border: 1px solid var(--line); border-radius: var(--radius); padding: 16px; text-align: center; }
  .stat .number { font-size: 32px; font-weight: 700; }
  .stat .label { color: var(--muted); font-size: 11px; text-transform: uppercase; letter-spacing: .08em; margin-top: 4px; }
  .stat.green .number { color: var(--green); }
  .stat.amber .number { color: var(--amber); }
  .stat.red .number { color: var(--red); }
  .stat.cyan .number { color: var(--cyan); }
</style>
</head>
<body>
<h1>💊 Medication Tracker</h1>
<p class="subtitle">Generated $generated_at — MyBuddy-AI RunningMedsList</p>

<div class="summary">
  <div class="stat cyan"><div class="number">$total_meds</div><div class="label">Active Meds</div></div>
  <div class="stat green"><div class="number">$taken_today</div><div class="label">Taken Today</div></div>
  <div class="stat amber"><div class="number">$due_today</div><div class="label">Due Today</div></div>
  <div class="stat red"><div class="number">$overdue_today</div><div class="label">Overdue</div></div>
</div>

$med_cards

<section class="log-section">
<h2>📋 Today's Log</h2>
$log_table
</section>

<p class="footer">MyBuddy-AI · RunningMedsList Skill · Data: $data_path</p>
</body>
</html>""")


def load_data(path: str) -> dict:
    if not os.path.exists(path):
        return {"medications": [], "log": []}
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def today_str() -> str:
    return datetime.now().strftime("%Y-%m-%d")


def get_today_log(data: dict) -> list:
    today = today_str()
    return [e for e in data.get("log", []) if e.get("takenAt", "").startswith(today)]


def time_status(time_str: str, taken_times: set, now_hm: str) -> str:
    if time_str in taken_times:
        return "taken"
    if time_str < now_hm:
        return "overdue"
    if time_str == now_hm:
        return "due"
    return "upcoming"


def generate_html(data: dict, data_path: str) -> str:
    now = datetime.now()
    now_hm = now.strftime("%H:%M")
    today_log = get_today_log(data)
    active_meds = [m for m in data.get("medications", []) if m.get("active", True)]

    taken_by_med: dict[str, set] = {}
    for entry in today_log:
        mid = entry.get("medId", "")
        scheduled = entry.get("scheduledFor", "")
        taken_by_med.setdefault(mid, set()).add(scheduled)

    taken_today = len(today_log)
    total_due = sum(len(m.get("times", [])) for m in active_meds)
    overdue = 0
    for m in active_meds:
        ts = taken_by_med.get(m["id"], set())
        for t in m.get("times", []):
            if t not in ts and t < now_hm:
                overdue += 1

    cards_html = ""
    for m in active_meds:
        ts = taken_by_med.get(m["id"], set())
        pills = ""
        for t in sorted(m.get("times", [])):
            status = time_status(t, ts, now_hm)
            pills += f'<span class="time-pill {status}">{t} — {status}</span>\n'
        notes = f'<p class="notes">{m.get("notes", "")}</p>' if m.get("notes") else ""
        cards_html += f"""<div class="card">
  <h2>{m['name']}</h2>
  <span class="dosage">{m.get('dosage', '')}</span>
  <p class="freq">{m.get('frequency', '')}</p>
  {notes}
  <div class="schedule">{pills}</div>
</div>\n"""

    if today_log:
        rows = ""
        for entry in sorted(today_log, key=lambda e: e.get("takenAt", "")):
            med = next((m for m in data.get("medications", []) if m["id"] == entry.get("medId")), None)
            name = med["name"] if med else entry.get("medId", "Unknown")
            taken_dt = entry.get("takenAt", "")
            try:
                taken_local = datetime.fromisoformat(taken_dt.replace("Z", "+00:00")).astimezone().strftime("%H:%M")
            except Exception:
                taken_local = taken_dt
            rows += f'<tr><td>{name}</td><td>{entry.get("scheduledFor", "—")}</td><td class="status-taken">{taken_local}</td><td>{entry.get("notes", "")}</td></tr>\n'
        log_table = f"<table><thead><tr><th>Medication</th><th>Scheduled</th><th>Taken At</th><th>Notes</th></tr></thead><tbody>{rows}</tbody></table>"
    else:
        log_table = '<p class="empty">No doses logged today yet.</p>'

    return HTML_TEMPLATE.substitute(
        generated_at=now.strftime("%Y-%m-%d %H:%M"),
        total_meds=len(active_meds),
        taken_today=taken_today,
        due_today=total_due - taken_today,
        overdue_today=overdue,
        med_cards=cards_html if cards_html else '<p class="empty">No active medications configured.</p>',
        log_table=log_table,
        data_path=data_path,
    )


def generate_md(data: dict, data_path: str) -> str:
    now = datetime.now()
    now_hm = now.strftime("%H:%M")
    today_log = get_today_log(data)
    active_meds = [m for m in data.get("medications", []) if m.get("active", True)]

    taken_by_med: dict[str, set] = {}
    for entry in today_log:
        mid = entry.get("medId", "")
        scheduled = entry.get("scheduledFor", "")
        taken_by_med.setdefault(mid, set()).add(scheduled)

    lines = [
        f"# 💊 Medication Tracker",
        f"",
        f"Generated: {now.strftime('%Y-%m-%d %H:%M')}  ",
        f"Data: `{data_path}`",
        "",
        "## Summary",
        "",
        f"- **Active medications:** {len(active_meds)}",
        f"- **Doses taken today:** {len(today_log)}",
        "",
        "## Medications",
        "",
    ]

    for m in active_meds:
        ts = taken_by_med.get(m["id"], set())
        lines.append(f"### {m['name']}")
        lines.append(f"- **Dosage:** {m.get('dosage', 'N/A')}")
        lines.append(f"- **Frequency:** {m.get('frequency', 'N/A')}")
        if m.get("notes"):
            lines.append(f"- **Notes:** {m['notes']}")
        lines.append("- **Schedule:**")
        for t in sorted(m.get("times", [])):
            status = time_status(t, ts, now_hm)
            check = "✅" if status == "taken" else ("⚠️" if status == "overdue" else "⏳")
            lines.append(f"  - {check} {t} — {status}")
        lines.append("")

    lines.append("## Today's Log")
    lines.append("")
    if today_log:
        lines.append("| Medication | Scheduled | Taken At | Notes |")
        lines.append("|---|---|---|---|")
        for entry in sorted(today_log, key=lambda e: e.get("takenAt", "")):
            med = next((m for m in data.get("medications", []) if m["id"] == entry.get("medId")), None)
            name = med["name"] if med else entry.get("medId", "Unknown")
            taken_dt = entry.get("takenAt", "")
            try:
                taken_local = datetime.fromisoformat(taken_dt.replace("Z", "+00:00")).astimezone().strftime("%H:%M")
            except Exception:
                taken_local = taken_dt
            lines.append(f"| {name} | {entry.get('scheduledFor', '—')} | {taken_local} | {entry.get('notes', '')} |")
    else:
        lines.append("_No doses logged today._")

    lines.append("")
    lines.append("---")
    lines.append(f"_MyBuddy-AI · RunningMedsList Skill_")
    return "\n".join(lines) + "\n"


def main():
    parser = argparse.ArgumentParser(description="Generate medication tracker page")
    parser.add_argument("--data", required=True, help="Path to meds-data.json")
    parser.add_argument("--output", required=True, help="Output file path")
    parser.add_argument("--format", choices=["html", "md"], required=True, help="Output format")
    args = parser.parse_args()

    data = load_data(args.data)
    if args.format == "html":
        content = generate_html(data, args.data)
    else:
        content = generate_md(data, args.data)

    os.makedirs(os.path.dirname(os.path.abspath(args.output)), exist_ok=True)
    with open(args.output, "w", encoding="utf-8") as f:
        f.write(content)
    print(f"Generated {args.format.upper()} tracker: {args.output}")


if __name__ == "__main__":
    main()
