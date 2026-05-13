use jwalk::{Parallelism, WalkDir};
use serde::Serialize;
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::time::{Duration, Instant};
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
    Partial {
        root: FileNode,
        files_scanned: u64,
        dirs_scanned: u64,
        total_size: u64,
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

struct NodeData {
    name: String,
    path: String,
    size: u64,
    is_dir: bool,
    extension: Option<String>,
    children: Vec<PathBuf>,
}

pub fn scan_directory(root_path: String, on_event: Channel<ScanEvent>) {
    scan_directory_impl(root_path, |event| {
        let _ = on_event.send(event);
    });
}

fn scan_directory_impl(root_path: String, mut on_event: impl FnMut(ScanEvent)) {
    let root = PathBuf::from(&root_path);
    if !root.exists() || !root.is_dir() {
        on_event(ScanEvent::Error {
            message: format!("Directory does not exist: {}", root_path),
        });
        return;
    }

    let mut nodes: HashMap<PathBuf, NodeData> = HashMap::new();
    let mut files_scanned: u64 = 0;
    let mut dirs_scanned: u64 = 0;
    let mut total_size: u64 = 0;

    let mut last_snapshot: Option<Instant> = None;
    let snapshot_count_step: u64 = 5000;
    let mut next_snapshot_threshold: u64 = snapshot_count_step;

    for entry in WalkDir::new(&root)
        .parallelism(ideal_parallelism(&root))
        .skip_hidden(false)
        .follow_links(false)
        .into_iter()
        .filter_map(|e| e.ok())
    {
        let path = entry.path();
        let is_dir = entry.file_type().is_dir();
        let is_root_entry = entry.depth == 0;

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

        nodes.insert(
            path.clone(),
            NodeData {
                name,
                path: path.to_string_lossy().to_string(),
                size,
                is_dir,
                extension,
                children: Vec::new(),
            },
        );

        if !is_root_entry {
            if let Some(parent_path) = path.parent() {
                if let Some(parent_node) = nodes.get_mut(parent_path) {
                    parent_node.children.push(path.clone());
                }
            }
        }

        if !is_dir && size > 0 {
            let mut cursor = path.parent().map(|p| p.to_path_buf());
            while let Some(p) = cursor {
                let Some(n) = nodes.get_mut(&p) else { break };
                n.size += size;
                cursor = p.parent().map(|x| x.to_path_buf());
            }
        }

        if is_dir {
            dirs_scanned += 1;
        } else {
            files_scanned += 1;
            total_size += size;
        }

        let total_entries = files_scanned + dirs_scanned;

        if total_entries % 500 == 0 {
            on_event(ScanEvent::Progress {
                files_scanned,
                dirs_scanned,
                total_size,
                current_path: path.to_string_lossy().to_string(),
            });
        }

        if total_entries >= next_snapshot_threshold {
            let should_send = match last_snapshot {
                None => true,
                Some(t) => t.elapsed() >= adaptive_interval(total_entries),
            };
            if should_send {
                if let Some(tree) = materialize_tree(&nodes, &root) {
                    on_event(ScanEvent::Partial {
                        root: tree,
                        files_scanned,
                        dirs_scanned,
                        total_size,
                    });
                }
                last_snapshot = Some(Instant::now());
            }
            next_snapshot_threshold = total_entries + snapshot_count_step;
        }
    }

    match materialize_tree(&nodes, &root) {
        Some(tree) => on_event(ScanEvent::Complete {
            root: tree,
            files_scanned,
            dirs_scanned,
            total_size,
        }),
        None => on_event(ScanEvent::Error {
            message: "Failed to build directory tree".to_string(),
        }),
    }
}

fn ideal_parallelism(root: &Path) -> Parallelism {
    let cpus = std::thread::available_parallelism()
        .map(|n| n.get())
        .unwrap_or(4);
    let threads = match detect_rotational(root) {
        Some(true) => 2,
        Some(false) => cpus.clamp(4, 16),
        None => cpus.clamp(4, 16),
    };
    Parallelism::RayonNewPool(threads)
}

#[cfg(target_os = "linux")]
fn detect_rotational(root: &Path) -> Option<bool> {
    let canonical = std::fs::canonicalize(root).ok()?;
    let canonical_str = canonical.to_str()?;
    let mountinfo = std::fs::read_to_string("/proc/self/mountinfo").ok()?;

    let mut best: Option<(usize, String, Option<String>)> = None;
    for line in mountinfo.lines() {
        let (before_dash, after_dash) = match line.split_once(" - ") {
            Some(parts) => parts,
            None => continue,
        };
        let fields: Vec<&str> = before_dash.split_whitespace().collect();
        if fields.len() < 5 {
            continue;
        }
        let majmin = fields[2];
        let mount_point = fields[4];
        let source = after_dash.split_whitespace().nth(1).map(|s| s.to_string());
        if path_starts_with(canonical_str, mount_point) {
            let len = mount_point.len();
            if best.as_ref().map_or(true, |(l, _, _)| len > *l) {
                best = Some((len, majmin.to_string(), source));
            }
        }
    }

    let (_, majmin, source) = best?;
    let mut candidates: Vec<String> = vec![
        format!("/sys/dev/block/{}/queue/rotational", majmin),
        format!("/sys/dev/block/{}/../queue/rotational", majmin),
    ];
    if let Some(src) = source.as_deref().and_then(|s| s.strip_prefix("/dev/")) {
        candidates.push(format!("/sys/class/block/{}/queue/rotational", src));
        candidates.push(format!("/sys/class/block/{}/../queue/rotational", src));
    }
    for path in &candidates {
        if let Ok(content) = std::fs::read_to_string(path) {
            return Some(content.trim() == "1");
        }
    }
    None
}

#[cfg(not(target_os = "linux"))]
fn detect_rotational(_root: &Path) -> Option<bool> {
    None
}

#[cfg(target_os = "linux")]
fn path_starts_with(path: &str, prefix: &str) -> bool {
    if !path.starts_with(prefix) {
        return false;
    }
    if prefix == "/" || path.len() == prefix.len() {
        return true;
    }
    path.as_bytes().get(prefix.len()) == Some(&b'/')
}

fn adaptive_interval(entries: u64) -> Duration {
    if entries < 50_000 {
        Duration::from_millis(500)
    } else if entries < 500_000 {
        Duration::from_millis(1000)
    } else {
        Duration::from_millis(2000)
    }
}

fn materialize_tree(nodes: &HashMap<PathBuf, NodeData>, root: &Path) -> Option<FileNode> {
    let root_data = nodes.get(root)?;
    Some(build_file_node(root_data, nodes))
}

fn build_file_node(data: &NodeData, nodes: &HashMap<PathBuf, NodeData>) -> FileNode {
    let mut children: Vec<FileNode> = data
        .children
        .iter()
        .filter_map(|child_path| nodes.get(child_path).map(|d| build_file_node(d, nodes)))
        .collect();
    children.sort_by(|a, b| b.size.cmp(&a.size));
    FileNode {
        name: data.name.clone(),
        path: data.path.clone(),
        size: data.size,
        is_dir: data.is_dir,
        extension: data.extension.clone(),
        child_count: children.len(),
        children,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::tempdir;

    #[test]
    fn emits_complete_with_full_tree_and_propagated_sizes() {
        let dir = tempdir().unwrap();
        let root = dir.path();
        fs::create_dir_all(root.join("a/b")).unwrap();
        fs::write(root.join("a/file1.txt"), b"hello").unwrap();
        fs::write(root.join("a/b/file2.txt"), b"world!").unwrap();
        fs::write(root.join("top.txt"), b"x").unwrap();

        let mut events = Vec::new();
        scan_directory_impl(root.to_string_lossy().to_string(), |e| events.push(e));

        let complete = events
            .iter()
            .find_map(|e| match e {
                ScanEvent::Complete {
                    root, total_size, ..
                } => Some((root, *total_size)),
                _ => None,
            })
            .expect("Complete event");

        let (root_node, total_size) = complete;
        assert_eq!(total_size, 12);
        assert_eq!(root_node.size, 12);
        assert!(root_node.is_dir);
        assert_eq!(root_node.children.len(), 2);
        assert_eq!(root_node.children[0].name, "a");
        assert_eq!(root_node.children[0].size, 11);
        assert_eq!(root_node.children[1].name, "top.txt");
        assert_eq!(root_node.children[1].size, 1);

        let a = &root_node.children[0];
        assert_eq!(a.children.len(), 2);
        assert_eq!(a.children[0].name, "b");
        assert_eq!(a.children[0].size, 6);
        assert_eq!(a.children[1].name, "file1.txt");
        assert_eq!(a.children[1].size, 5);
    }

    #[test]
    fn emits_partial_during_large_scan() {
        let dir = tempdir().unwrap();
        let root = dir.path();
        for i in 0..6000 {
            fs::write(root.join(format!("f{}.txt", i)), b"x").unwrap();
        }

        let mut events = Vec::new();
        scan_directory_impl(root.to_string_lossy().to_string(), |e| events.push(e));

        let partials: Vec<_> = events
            .iter()
            .filter_map(|e| match e {
                ScanEvent::Partial {
                    root,
                    files_scanned,
                    dirs_scanned,
                    ..
                } => Some((root, *files_scanned + *dirs_scanned)),
                _ => None,
            })
            .collect();
        assert!(
            !partials.is_empty(),
            "expected at least one Partial event for large scan"
        );
        let (partial_root, partial_entries) = partials[0];
        assert!(partial_entries >= 5000);
        assert!(partial_root.is_dir);
        assert!(!partial_root.children.is_empty());

        assert!(events
            .iter()
            .any(|e| matches!(e, ScanEvent::Complete { .. })));
    }

    #[test]
    fn no_partial_for_small_scan() {
        let dir = tempdir().unwrap();
        let root = dir.path();
        fs::write(root.join("a.txt"), b"x").unwrap();

        let mut events = Vec::new();
        scan_directory_impl(root.to_string_lossy().to_string(), |e| events.push(e));

        assert!(!events
            .iter()
            .any(|e| matches!(e, ScanEvent::Partial { .. })));
        assert!(events
            .iter()
            .any(|e| matches!(e, ScanEvent::Complete { .. })));
    }

    #[cfg(target_os = "linux")]
    #[test]
    #[ignore]
    fn probe_rotational_on_host() {
        for p in ["/", "/home", "/tmp", "/boot"] {
            let r = detect_rotational(Path::new(p));
            eprintln!("detect_rotational({}) = {:?}", p, r);
        }
    }

    #[cfg(target_os = "linux")]
    #[test]
    fn path_starts_with_handles_prefix_edge_cases() {
        assert!(path_starts_with("/", "/"));
        assert!(path_starts_with("/foo", "/"));
        assert!(path_starts_with("/foo", "/foo"));
        assert!(path_starts_with("/foo/bar", "/foo"));
        assert!(!path_starts_with("/foobar", "/foo"));
        assert!(!path_starts_with("/bar", "/foo"));
    }

    #[test]
    fn error_for_nonexistent_path() {
        let mut events = Vec::new();
        scan_directory_impl(
            "/this/path/should/not/exist/spacefinder_test".to_string(),
            |e| events.push(e),
        );
        assert!(matches!(events.last(), Some(ScanEvent::Error { .. })));
    }
}
