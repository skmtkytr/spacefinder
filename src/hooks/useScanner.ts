import { useCallback } from "react";
import { invoke, Channel } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { useAppStore } from "../store/appStore";
import type { ScanEvent } from "../types/scanner";

export function useScanner() {
  const {
    setScanStatus,
    setScanProgress,
    setScanComplete,
    setDiskInfo,
    setScanPath,
    reset,
    scanPath,
    scanStatus,
  } = useAppStore();

  const scanDirectory = useCallback(
    async (path: string) => {
      reset();
      setScanPath(path);
      setScanStatus("scanning");

      // Fetch disk info
      try {
        const info = await invoke<{
          name: string;
          mountPoint: string;
          totalSpace: number;
          availableSpace: number;
          usedSpace: number;
          usagePercent: number;
          fileSystem: string;
        }>("get_disk_info", { path });
        setDiskInfo(info);
      } catch {
        // Non-fatal
      }

      const onEvent = new Channel<ScanEvent>();
      onEvent.onmessage = (event) => {
        switch (event.type) {
          case "progress":
            setScanProgress({
              filesScanned: event.filesScanned,
              dirsScanned: event.dirsScanned,
              totalSize: event.totalSize,
              currentPath: event.currentPath,
            });
            break;
          case "complete":
            setScanComplete(event.root);
            break;
          case "error":
            setScanStatus("error");
            console.error("Scan error:", event.message);
            break;
        }
      };

      try {
        await invoke("scan_directory", { path, onEvent });
      } catch (err) {
        setScanStatus("error");
        console.error("Invoke error:", err);
      }
    },
    [reset, setScanPath, setScanStatus, setScanProgress, setScanComplete, setDiskInfo],
  );

  const openAndScan = useCallback(async () => {
    const selected = await open({ directory: true, multiple: false });
    if (selected) {
      await scanDirectory(selected as string);
    }
  }, [scanDirectory]);

  const rescan = useCallback(async () => {
    if (scanPath) {
      await scanDirectory(scanPath);
    }
  }, [scanPath, scanDirectory]);

  return { openAndScan, rescan, scanDirectory, scanStatus };
}
