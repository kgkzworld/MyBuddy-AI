use serde::Serialize;
use std::path::{Path, PathBuf};

const MAX_READ_BYTES: usize = 256 * 1024;
const MAX_WRITE_BYTES: usize = 256 * 1024;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FileReadResult {
    pub path: String,
    pub content: String,
    pub truncated: bool,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FileWriteResult {
    pub path: String,
    pub bytes_written: usize,
}

fn is_under_any(path: &Path, allowed: &[PathBuf]) -> bool {
    let canonical = match std::fs::canonicalize(path) {
        Ok(p) => p,
        Err(_) => {
            if let Some(parent) = path.parent() {
                match std::fs::canonicalize(parent) {
                    Ok(p) => p.join(path.file_name().unwrap_or_default()),
                    Err(_) => return false,
                }
            } else {
                return false;
            }
        }
    };
    for dir in allowed {
        if let Ok(allowed_canonical) = std::fs::canonicalize(dir) {
            if canonical.starts_with(&allowed_canonical) {
                return true;
            }
        }
    }
    false
}

const BLOCKED_EXTENSIONS: &[&str] = &[
    "exe", "dll", "bat", "cmd", "ps1", "psm1", "vbs", "js", "wsh", "wsf",
    "scr", "com", "msi", "msp", "reg", "sys", "drv", "inf", "ocx",
];

fn has_blocked_extension(path: &Path) -> bool {
    path.extension()
        .and_then(|ext| ext.to_str())
        .map(|ext| BLOCKED_EXTENSIONS.contains(&ext.to_ascii_lowercase().as_str()))
        .unwrap_or(false)
}

/// Read a text file. The `allowed_dirs` list is passed from the frontend
/// based on the user's configured skills path, data path, and vault path.
#[tauri::command]
pub fn agent_read_file(path: String, allowed_dirs: Vec<String>) -> Result<FileReadResult, String> {
    let file_path = PathBuf::from(&path);
    let allowed: Vec<PathBuf> = allowed_dirs.iter().filter(|s| !s.is_empty()).map(PathBuf::from).collect();
    if allowed.is_empty() {
        return Err("No allowed directories are configured. Open Settings and set a skills path or data path first.".into());
    }
    if !is_under_any(&file_path, &allowed) {
        return Err("File path is outside the configured allowed directories.".into());
    }
    if has_blocked_extension(&file_path) {
        return Err("Reading executable or script files is not permitted.".into());
    }
    let content = std::fs::read_to_string(&file_path)
        .map_err(|e| format!("Could not read file: {e}"))?;
    let truncated = content.len() > MAX_READ_BYTES;
    let safe_content = if truncated {
        content[..MAX_READ_BYTES].to_string()
    } else {
        content
    };
    Ok(FileReadResult {
        path,
        content: safe_content,
        truncated,
    })
}

/// Write a text file. The `allowed_dirs` list is passed from the frontend
/// based on the user's configured skills path and data path.
#[tauri::command]
pub fn agent_write_file(path: String, content: String, allowed_dirs: Vec<String>) -> Result<FileWriteResult, String> {
    if content.len() > MAX_WRITE_BYTES {
        return Err(format!(
            "Content exceeds the maximum write size of {} bytes.",
            MAX_WRITE_BYTES
        ));
    }
    let file_path = PathBuf::from(&path);
    let allowed: Vec<PathBuf> = allowed_dirs.iter().filter(|s| !s.is_empty()).map(PathBuf::from).collect();
    if allowed.is_empty() {
        return Err("No allowed directories are configured. Open Settings and set a skills path or data path first.".into());
    }
    if !is_under_any(&file_path, &allowed) {
        return Err("File path is outside the configured allowed directories.".into());
    }
    if has_blocked_extension(&file_path) {
        return Err("Writing executable or script files is not permitted.".into());
    }
    if let Some(parent) = file_path.parent() {
        std::fs::create_dir_all(parent)
            .map_err(|e| format!("Could not create directories: {e}"))?;
    }
    let bytes = content.as_bytes();
    std::fs::write(&file_path, bytes)
        .map_err(|e| format!("Could not write file: {e}"))?;
    Ok(FileWriteResult {
        path,
        bytes_written: bytes.len(),
    })
}
