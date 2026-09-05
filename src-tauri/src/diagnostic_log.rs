use serde_json::{Map, Value};
use std::{
    fs::{self, OpenOptions},
    io::Write,
};
use tauri::Manager;

const SENSITIVE_KEYS: &[&str] = &[
    "content",
    "password",
    "secret",
    "text",
    "title",
    "token",
    "windowtitle",
];

fn redact(value: Value) -> Value {
    match value {
        Value::Object(entries) => Value::Object(
            entries
                .into_iter()
                .filter_map(|(key, value)| {
                    let normalized = key.to_ascii_lowercase();
                    (!SENSITIVE_KEYS.contains(&normalized.as_str())).then(|| (key, redact(value)))
                })
                .collect::<Map<String, Value>>(),
        ),
        Value::Array(values) => Value::Array(values.into_iter().map(redact).collect()),
        other => other,
    }
}

pub fn format_record(at: &str, event: &str, detail: Value) -> String {
    let record = serde_json::json!({
        "at": at,
        "event": event,
        "detail": redact(detail),
    });
    format!("{}\n", record)
}

fn append_record(
    app: &tauri::AppHandle,
    at: &str,
    event: &str,
    detail: Value,
) -> Result<String, String> {
    let directory = app
        .path()
        .app_local_data_dir()
        .map_err(|error| error.to_string())?
        .join("logs");
    fs::create_dir_all(&directory).map_err(|error| error.to_string())?;
    let path = directory.join("ambient-agent.jsonl");
    let mut file = OpenOptions::new()
        .create(true)
        .append(true)
        .open(&path)
        .map_err(|error| error.to_string())?;
    file.write_all(format_record(at, event, detail).as_bytes())
        .map_err(|error| error.to_string())?;
    Ok(path.to_string_lossy().into_owned())
}

pub fn append_internal(
    app: &tauri::AppHandle,
    event: &str,
    detail: Value,
) -> Result<String, String> {
    let at = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map_err(|error| error.to_string())?
        .as_millis()
        .to_string();
    append_record(app, &at, event, detail)
}

#[tauri::command]
pub fn append_diagnostic_log(
    app: tauri::AppHandle,
    at: String,
    event: String,
    detail: Value,
) -> Result<String, String> {
    append_record(&app, &at, &event, detail)
}

#[cfg(test)]
mod tests {
    use super::format_record;

    #[test]
    fn diagnostic_record_is_one_redacted_json_line() {
        let line = format_record(
            "2026-08-28T12:33:03Z",
            "paused",
            serde_json::json!({ "windowTitle": "Secret document", "reason": "user" }),
        );
        let parsed: serde_json::Value = serde_json::from_str(line.trim_end()).unwrap();

        assert_eq!(parsed["at"], "2026-08-28T12:33:03Z");
        assert_eq!(parsed["event"], "paused");
        assert_eq!(parsed["detail"]["reason"], "user");
        assert!(parsed["detail"].get("windowTitle").is_none());
        assert!(line.ends_with('\n'));
    }
}
