import { useEffect } from "react";

interface ShortcutCallbacks {
  navigateUp: () => void;
  openAndScan: () => void;
  rescan: () => void;
  toggleFilter: () => void;
  closeContextMenu: () => void;
  navigateToRoot: () => void;
}

export function useKeyboardShortcuts(callbacks: ShortcutCallbacks) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;

      // Escape — always works
      if (e.key === "Escape") {
        callbacks.closeContextMenu();
        return;
      }

      // Skip shortcuts when typing in inputs (except Escape above)
      if (isInput) return;

      // Backspace / Alt+ArrowUp — navigate up
      if (e.key === "Backspace" || (e.altKey && e.key === "ArrowUp")) {
        e.preventDefault();
        callbacks.navigateUp();
        return;
      }

      // Cmd/Ctrl+O — open folder
      if (mod && e.key === "o") {
        e.preventDefault();
        callbacks.openAndScan();
        return;
      }

      // Cmd/Ctrl+R — rescan
      if (mod && e.key === "r") {
        e.preventDefault();
        callbacks.rescan();
        return;
      }

      // Cmd/Ctrl+F — toggle filter
      if (mod && e.key === "f") {
        e.preventDefault();
        callbacks.toggleFilter();
        return;
      }

      // Home — jump to root
      if (e.key === "Home") {
        e.preventDefault();
        callbacks.navigateToRoot();
        return;
      }
    };

    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [callbacks]);
}
