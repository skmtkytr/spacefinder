import type { FileNode } from "./fileTree";

export type ScanStatus = "idle" | "scanning" | "complete" | "error";

export interface ScanProgress {
  filesScanned: number;
  dirsScanned: number;
  totalSize: number;
  currentPath: string;
}

export type ScanEvent =
  | {
      type: "progress";
      filesScanned: number;
      dirsScanned: number;
      totalSize: number;
      currentPath: string;
    }
  | {
      type: "complete";
      root: FileNode;
      filesScanned: number;
      dirsScanned: number;
      totalSize: number;
    }
  | {
      type: "error";
      message: string;
    };
