---
name: running-meds-list
description: Use when tracking daily medications, doses, and schedules. Generates HTML and MD medication trackers with cron-based reminders.
version: 1.0.0
license: MIT
platforms: [linux, macos, windows]
metadata:
  hermes:
    tags: [health, medication, tracking, cron, scheduler]
    related_skills: []
---

# RunningMedsList

Track daily medications, dosage schedules, and administration times. Generates both an interactive HTML tracker and a Markdown log for vault storage.

## First-time setup

On first invocation the skill must ask the user:

1. **Data directory** — where to save the persistent JSON data file (`meds-data.json`). Store this path in localStorage key `mybuddy-meds-data-path` so it is remembered across sessions.
2. **Output directory** — where to write the generated HTML and MD files. Store in localStorage key `mybuddy-meds-output-path`.

If these keys already exist, use the stored paths without re-asking.

## Data model

All medication state lives in a single `meds-data.json` file:

```json
{
  "medications": [
    {
      "id": "med-uuid",
      "name": "Medication Name",
      "dosage": "500mg",
      "frequency": "every 8 hours",
      "frequencyHours": 8,
      "times": ["08:00", "16:00", "00:00"],
      "notes": "Take with food",
      "active": true,
      "addedAt": "ISO-8601"
    }
  ],
  "log": [
    {
      "medId": "med-uuid",
      "takenAt": "ISO-8601",
      "scheduledFor": "08:00",
      "notes": ""
    }
  ]
}
```

## Capabilities

### `/RunningMedsList`

When the user invokes this command:

1. Load `meds-data.json` from the stored data path.
2. Show a summary of today's medications: which are due, which have been taken, which are overdue.
3. Offer to:
   - **Add a medication** — name, dosage, frequency, scheduled times, notes.
   - **Log a dose** — record that a medication was just taken.
   - **Remove a medication** — mark as inactive.
   - **Generate reports** — rebuild the HTML and MD output files.
   - **Schedule a reminder** — create a cron job for the next upcoming dose.

### Generating HTML output

Run the bundled script to produce `meds-tracker.html`:

```bash
python "$MBAI_HARNESS_PATH/skills/running-meds-list/scripts/generate_meds_tracker.py" \
  --data "$MEDS_DATA_PATH/meds-data.json" \
  --output "$MEDS_OUTPUT_PATH/meds-tracker.html" \
  --format html
```

### Generating MD output

```bash
python "$MBAI_HARNESS_PATH/skills/running-meds-list/scripts/generate_meds_tracker.py" \
  --data "$MEDS_DATA_PATH/meds-data.json" \
  --output "$MEDS_OUTPUT_PATH/meds-tracker.md" \
  --format md
```

### Scheduling cron reminders

Use the Hermes `cronjob_manage` tool or the system's task scheduler to create a reminder for the next scheduled dose. The cron job should:

1. Read `meds-data.json` for the next upcoming scheduled time.
2. Send a notification with the medication name and dosage.
3. The job expression should match the medication's scheduled time (e.g., `0 8 * * *` for 8:00 AM daily).

## Lessons

- Always read `meds-data.json` before any mutation to avoid stale overwrites.
- The HTML tracker must be self-contained (inline CSS/JS) so it works offline.
- Keep the MD version vault-compatible with standard Obsidian-flavored markdown.
- Timestamps are always ISO-8601 in UTC; display in local time in the HTML tracker.
- The `log` array is append-only; never delete entries, only add new ones.
