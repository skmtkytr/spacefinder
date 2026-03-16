use serde::Serialize;
use std::path::Path;
use sysinfo::Disks;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DiskInfo {
    pub name: String,
    pub mount_point: String,
    pub total_space: u64,
    pub available_space: u64,
    pub used_space: u64,
    pub usage_percent: f64,
    pub file_system: String,
}

pub fn get_disk_info(path: &str) -> Result<DiskInfo, String> {
    let target = Path::new(path);
    let disks = Disks::new_with_refreshed_list();

    // Find the disk that contains this path (longest mount point match)
    let disk = disks
        .iter()
        .filter(|d| target.starts_with(d.mount_point()))
        .max_by_key(|d| d.mount_point().to_string_lossy().len())
        .ok_or_else(|| format!("No disk found for path: {}", path))?;

    let total = disk.total_space();
    let available = disk.available_space();
    let used = total.saturating_sub(available);
    let usage_percent = if total > 0 {
        (used as f64 / total as f64) * 100.0
    } else {
        0.0
    };

    Ok(DiskInfo {
        name: disk.name().to_string_lossy().to_string(),
        mount_point: disk.mount_point().to_string_lossy().to_string(),
        total_space: total,
        available_space: available,
        used_space: used,
        usage_percent,
        file_system: disk.file_system().to_string_lossy().to_string(),
    })
}
