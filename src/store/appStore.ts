import { create } from "zustand";
import type { FileNode, DiskInfo } from "../types/fileTree";
import type { ScanProgress, ScanStatus } from "../types/scanner";

interface Filters {
  namePattern: string;
  minSize: number;
  selectedCategories: string[];
}

interface AppState {
  // Scan
  scanStatus: ScanStatus;
  scanProgress: ScanProgress | null;
  rootNode: FileNode | null;
  diskInfo: DiskInfo | null;
  scanPath: string | null;

  // Navigation
  pathStack: string[];
  currentPath: string | null;

  // Filters
  filters: Filters;

  // Path index for O(1) lookups
  pathIndex: Map<string, FileNode>;

  // Actions
  setScanStatus: (status: ScanStatus) => void;
  setScanProgress: (progress: ScanProgress) => void;
  setScanPartial: (root: FileNode) => void;
  setScanComplete: (root: FileNode) => void;
  setDiskInfo: (info: DiskInfo) => void;
  setScanPath: (path: string) => void;

  navigateTo: (path: string) => void;
  navigateUp: () => void;
  navigateToIndex: (index: number) => void;

  setFilters: (filters: Partial<Filters>) => void;
  resetFilters: () => void;

  reset: () => void;
}

function buildPathIndex(node: FileNode): Map<string, FileNode> {
  const map = new Map<string, FileNode>();
  const stack: FileNode[] = [node];
  while (stack.length > 0) {
    const n = stack.pop()!;
    map.set(n.path, n);
    for (const child of n.children) {
      stack.push(child);
    }
  }
  return map;
}

const defaultFilters: Filters = {
  namePattern: "",
  minSize: 0,
  selectedCategories: [],
};

export const useAppStore = create<AppState>((set) => ({
  scanStatus: "idle",
  scanProgress: null,
  rootNode: null,
  diskInfo: null,
  scanPath: null,
  pathStack: [],
  currentPath: null,
  filters: { ...defaultFilters },
  pathIndex: new Map(),

  setScanStatus: (status) => set({ scanStatus: status }),
  setScanProgress: (progress) => set({ scanProgress: progress }),
  setScanPartial: (root) =>
    set((state) => {
      const pathIndex = buildPathIndex(root);
      const stackValid =
        state.pathStack.length > 0 &&
        state.pathStack.every((p) => pathIndex.has(p));
      if (stackValid) {
        return { rootNode: root, pathIndex };
      }
      return {
        rootNode: root,
        pathIndex,
        pathStack: [root.path],
        currentPath: root.path,
      };
    }),
  setScanComplete: (root) => {
    const pathIndex = buildPathIndex(root);
    set((state) => {
      const stackValid =
        state.pathStack.length > 0 &&
        state.pathStack.every((p) => pathIndex.has(p));
      if (stackValid) {
        return {
          rootNode: root,
          scanStatus: "complete" as ScanStatus,
          pathIndex,
        };
      }
      return {
        rootNode: root,
        scanStatus: "complete" as ScanStatus,
        pathStack: [root.path],
        currentPath: root.path,
        pathIndex,
      };
    });
  },
  setDiskInfo: (info) => set({ diskInfo: info }),
  setScanPath: (path) => set({ scanPath: path }),

  navigateTo: (path) =>
    set((state) => ({
      pathStack: [...state.pathStack, path],
      currentPath: path,
    })),
  navigateUp: () =>
    set((state) => {
      if (state.pathStack.length <= 1) return state;
      const newStack = state.pathStack.slice(0, -1);
      return {
        pathStack: newStack,
        currentPath: newStack[newStack.length - 1],
      };
    }),
  navigateToIndex: (index) =>
    set((state) => {
      if (index < 0 || index >= state.pathStack.length) return state;
      const newStack = state.pathStack.slice(0, index + 1);
      return {
        pathStack: newStack,
        currentPath: newStack[newStack.length - 1],
      };
    }),

  setFilters: (filters) =>
    set((state) => ({
      filters: { ...state.filters, ...filters },
    })),
  resetFilters: () => set({ filters: { ...defaultFilters } }),

  reset: () =>
    set({
      scanStatus: "idle",
      scanProgress: null,
      rootNode: null,
      diskInfo: null,
      scanPath: null,
      pathStack: [],
      currentPath: null,
      filters: { ...defaultFilters },
      pathIndex: new Map(),
    }),
}));
