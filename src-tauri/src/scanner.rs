use jwalk::WalkDir;
use serde::Serialize;
use std::collections::HashMap;
use std::path::PathBuf;
use tauri::ipc::Channel;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FileNode {
    pub name: String,
    pub path: String,
    pub size: u64,
    pub is_dir: bool,
    pub extension: Option<String>,
    pub child_count: usize,
    pub children: Vec<FileNode>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum ScanEvent {
    #[serde(rename_all = "camelCase")]
    Progress {
        files_scanned: u64,
        dirs_scanned: u64,
        total_size: u64,
        current_path: String,
    },
    #[serde(rename_all = "camelCase")]
    Complete {
        root: FileNode,
        files_scanned: u64,
        dirs_scanned: u64,
        total_size: u64,
    },
    Error {
        message: String,
    },
}

struct EntryInfo {
    path: PathBuf,
    name: String,
    size: u64,
    is_dir: bool,
    extension: Option<String>,
    depth: usize,
    parent: PathBuf,
}

pub fn scan_directory(root_path: String, on_event: Channel<ScanEvent>) {
    let root = PathBuf::from(&root_path);
    if !root.exists() || !root.is_dir() {
        let _ = on_event.send(ScanEvent::Error {
            message: format!("Directory does not exist: {}", root_path),
        });
        return;
    }

    let mut entries: Vec<EntryInfo> = Vec::new();
    let mut files_scanned: u64 = 0;
    let mut dirs_scanned: u64 = 0;
    let mut total_size: u64 = 0;

    // Collect all entries using jwalk parallel walker
    for entry in WalkDir::new(&root)
        .skip_hidden(false)
        .follow_links(false)
        .into_iter()
        .filter_map(|e| e.ok())
    {
        let path = entry.path();
        let is_dir = entry.file_type().is_dir();
        let depth = entry.depth;

        let size = if is_dir {
            0
        } else {
            entry.metadata().map(|m| m.len()).unwrap_or(0)
        };

        let name = path
            .file_name()
            .map(|n| n.to_string_lossy().to_string())
            .unwrap_or_else(|| root_path.clone());

        let extension = if is_dir {
            None
        } else {
            path.extension().map(|e| e.to_string_lossy().to_lowercase())
        };

        let parent = path
            .parent()
            .map(|p| p.to_path_buf())
            .unwrap_or_else(|| path.to_path_buf());

        if is_dir {
            dirs_scanned += 1;
        } else {
            files_scanned += 1;
            total_size += size;
        }

        entries.push(EntryInfo {
            path: path.clone(),
            name,
            size,
            is_dir,
            extension,
            depth,
            parent,
        });

        // Send progress every 500 entries
        if (files_scanned + dirs_scanned) % 500 == 0 {
            let _ = on_event.send(ScanEvent::Progress {
                files_scanned,
                dirs_scanned,
                total_size,
                current_path: path.to_string_lossy().to_string(),
            });
        }
    }

    // Sort by depth descending for bottom-up tree construction
    entries.sort_by(|a, b| b.depth.cmp(&a.depth));

    // Build tree bottom-up
    let mut node_map: HashMap<PathBuf, FileNode> = HashMap::new();

    for entry in entries {
        if entry.is_dir {
            // Check if we already have accumulated children for this dir
            let mut dir_node = node_map.remove(&entry.path).unwrap_or_else(|| FileNode {
                name: String::new(),
                path: String::new(),
                size: 0,
                is_dir: true,
                extension: None,
                child_count: 0,
                children: Vec::new(),
            });
            // Always set metadata from the actual entry (placeholder nodes have empty fields)
            dir_node.name = entry.name;
            dir_node.path = entry.path.to_string_lossy().to_string();
            dir_node.is_dir = true;
            // Calculate dir size from children
            dir_node.size = dir_node.children.iter().map(|c| c.size).sum();
            dir_node.child_count = dir_node.children.len();
            // Sort children by size descending
            dir_node.children.sort_by(|a, b| b.size.cmp(&a.size));

            if entry.path == root {
                // This is the root node - send complete
                let _ = on_event.send(ScanEvent::Complete {
                    root: dir_node,
                    files_scanned,
                    dirs_scanned,
                    total_size,
                });
                return;
            }

            // Add to parent
            node_map
                .entry(entry.parent)
                .or_insert_with(|| FileNode {
                    name: String::new(),
                    path: String::new(),
                    size: 0,
                    is_dir: true,
                    extension: None,
                    child_count: 0,
                    children: Vec::new(),
                })
                .children
                .push(dir_node);
        } else {
            // File node
            let node = FileNode {
                name: entry.name,
                path: entry.path.to_string_lossy().to_string(),
                size: entry.size,
                is_dir: false,
                extension: entry.extension,
                child_count: 0,
                children: Vec::new(),
            };
            // Add to parent directory
            node_map
                .entry(entry.parent)
                .or_insert_with(|| FileNode {
                    name: String::new(),
                    path: String::new(),
                    size: 0,
                    is_dir: true,
                    extension: None,
                    child_count: 0,
                    children: Vec::new(),
                })
                .children
                .push(node);
        }
    }

    // If we get here, something went wrong
    let _ = on_event.send(ScanEvent::Error {
        message: "Failed to build directory tree".to_string(),
    });
}
