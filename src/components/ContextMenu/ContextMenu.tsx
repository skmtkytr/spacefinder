import React, { useEffect, useRef, useState, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { revealItemInDir } from "@tauri-apps/plugin-opener";
import type { FileNode } from "../../types/fileTree";
import { useScanner } from "../../hooks/useScanner";

interface Props {
  node: FileNode;
  x: number;
  y: number;
  onClose: () => void;
}

interface MenuItem {
  label: string;
  shortcut?: string;
  icon: React.ReactNode;
  onClick: () => void;
  color?: string;
  separator?: boolean;
}

export const ContextMenu: React.FC<Props> = ({ node, x, y, onClose }) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const { scanDirectory, rescan } = useScanner();
  const [activeIndex, setActiveIndex] = useState(-1);

  const handleReveal = useCallback(async () => {
    try {
      await revealItemInDir(node.path);
    } catch (err) {
      console.error("Failed to reveal:", err);
    }
    onClose();
  }, [node.path, onClose]);

  const handleScanFolder = useCallback(async () => {
    if (node.isDir) {
      await scanDirectory(node.path);
    }
    onClose();
  }, [node.isDir, node.path, scanDirectory, onClose]);

  const handleMoveToTrash = useCallback(async () => {
    if (!confirm(`Move "${node.name}" to trash?`)) return;
    try {
      await invoke("move_to_trash", { path: node.path });
      rescan();
    } catch (err) {
      console.error("Failed to move to trash:", err);
    }
    onClose();
  }, [node.name, node.path, rescan, onClose]);

  const handleDeletePermanently = useCallback(async () => {
    if (!confirm(`Permanently delete "${node.name}"? This cannot be undone.`)) return;
    try {
      await invoke("delete_permanently", { path: node.path });
      rescan();
    } catch (err) {
      console.error("Failed to delete:", err);
    }
    onClose();
  }, [node.name, node.path, rescan, onClose]);

  const items: MenuItem[] = [
    {
      label: "Reveal in Finder",
      icon: (
        <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="7" cy="7" r="4" /><path d="M10 10l3 3" />
        </svg>
      ),
      onClick: handleReveal,
    },
    ...(node.isDir
      ? [
          {
            label: "Scan this folder",
            icon: (
              <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 3h4l2 2h6v8H2z" />
              </svg>
            ),
            onClick: handleScanFolder,
          },
        ]
      : []),
    {
      label: "Move to Trash",
      shortcut: "\u2318\u232B",
      icon: (
        <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 4h10M6 4V3h4v1M5 4v9h6V4" />
        </svg>
      ),
      onClick: handleMoveToTrash,
      color: "text-yellow-400",
      separator: true,
    },
    {
      label: "Delete Permanently",
      shortcut: "\u21E7\u2318\u232B",
      icon: (
        <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 4l8 8M12 4l-8 8" />
        </svg>
      ),
      onClick: handleDeletePermanently,
      color: "text-red-400",
    },
  ];

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as HTMLElement)) {
        onClose();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((prev) => (prev + 1) % items.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((prev) => (prev <= 0 ? items.length - 1 : prev - 1));
        return;
      }
      if (e.key === "Enter" && activeIndex >= 0) {
        e.preventDefault();
        items[activeIndex].onClick();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, activeIndex, items]);

  return (
    <div
      ref={menuRef}
      className="fixed z-50 backdrop-blur-sm bg-gray-800/95 border border-gray-600 rounded-lg shadow-xl py-1 min-w-[200px] animate-fade-in"
      style={{ left: x, top: y }}
    >
      <div className="px-3 py-1.5 text-xs text-gray-400 truncate max-w-[250px] border-b border-gray-700">
        {node.name}
      </div>
      {items.map((item, i) => (
        <React.Fragment key={item.label}>
          {item.separator && <div className="my-1 border-t border-gray-700" />}
          <button
            onClick={item.onClick}
            onMouseEnter={() => setActiveIndex(i)}
            className={`w-full text-left px-3 py-1.5 text-sm flex items-center gap-2 transition-colors ${
              item.color ?? "text-gray-200"
            } ${activeIndex === i ? "bg-gray-700" : "hover:bg-gray-700"}`}
          >
            <span className="opacity-70">{item.icon}</span>
            <span className="flex-1">{item.label}</span>
            {item.shortcut && (
              <span className="text-xs text-gray-500 ml-4">{item.shortcut}</span>
            )}
          </button>
        </React.Fragment>
      ))}
    </div>
  );
};
