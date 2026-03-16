export interface FileNode {
  name: string;
  path: string;
  size: number;
  isDir: boolean;
  extension: string | null;
  childCount: number;
  children: FileNode[];
}

export interface DiskInfo {
  name: string;
  mountPoint: string;
  totalSpace: number;
  availableSpace: number;
  usedSpace: number;
  usagePercent: number;
  fileSystem: string;
}
