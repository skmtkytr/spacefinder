import React, { useEffect, useRef } from "react";
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

export const ContextMenu: React.FC<Props> = ({ node, x, y, onClose }) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const { scanDirectory, rescan } = useScanner();

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as HTMLElement)) {
        onClose();
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [onClose]);

  const handleReveal = async () => {
    try {
      await revealItemInDir(node.path);
    } catch (err) {
      console.error("Failed to reveal:", err);
    }
    onClose();
  };

  const handleScanFolder = async () => {
    if (node.isDir) {
      await scanDirectory(node.path);
    }
    onClose();
  };

  const handleMoveToTrash = async () => {
    if (!confirm(`Move "${node.name}" to trash?`)) return;
    try {
      await invoke("move_to_trash", { path: node.path });
      rescan();
    } catch (err) {
      console.error("Failed to move to trash:", err);
    }
    onClose();
  };

  const handleDeletePermanently = async () => {
    if (!confirm(`Permanently delete "${node.name}"? This cannot be undone.`)) return;
    try {
      await invoke("delete_permanently", { path: node.path });
      rescan();
    } catch (err) {
      console.error("Failed to delete:", err);
    }
    onClose();
  };

  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-gray-800 border border-gray-600 rounded-lg shadow-xl py-1 min-w-[180px]"
      style={{ left: x, top: y }}
    >
      <div className="px-3 py-1.5 text-xs text-gray-400 truncate max-w-[250px] border-b border-gray-700">
        {node.name}
      </div>
      <button
        onClick={handleReveal}
        className="w-full text-left px-3 py-1.5 text-sm text-gray-200 hover:bg-gray-700 transition-colors"
      >
        Reveal in Finder
      </button>
      {node.isDir && (
        <button
          onClick={handleScanFolder}
          className="w-full text-left px-3 py-1.5 text-sm text-gray-200 hover:bg-gray-700 transition-colors"
        >
          Scan this folder
        </button>
      )}
      <div className="my-1 border-t border-gray-700" />
      <button
        onClick={handleMoveToTrash}
        className="w-full text-left px-3 py-1.5 text-sm text-yellow-400 hover:bg-gray-700 transition-colors"
      >
        Move to Trash
      </button>
      <button
        onClick={handleDeletePermanently}
        className="w-full text-left px-3 py-1.5 text-sm text-red-400 hover:bg-gray-700 transition-colors"
      >
        Delete Permanently
      </button>
    </div>
  );
};
