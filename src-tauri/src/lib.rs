mod disk_info;
mod file_ops;
mod scanner;

use scanner::ScanEvent;
use tauri::ipc::Channel;

#[tauri::command]
async fn scan_directory(path: String, on_event: Channel<ScanEvent>) -> Result<(), String> {
    tokio::task::spawn_blocking(move || {
        scanner::scan_directory(path, on_event);
    })
    .await
    .map_err(|e| format!("Scan task failed: {}", e))
}

#[tauri::command]
async fn get_disk_info(path: String) -> Result<disk_info::DiskInfo, String> {
    disk_info::get_disk_info(&path)
}

#[tauri::command]
async fn move_to_trash(path: String) -> Result<(), String> {
    file_ops::move_to_trash(&path)
}

#[tauri::command]
async fn delete_permanently(path: String) -> Result<(), String> {
    file_ops::delete_permanently(&path)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            scan_directory,
            get_disk_info,
            move_to_trash,
            delete_permanently,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
