import React from "react";
import type { FileNode } from "../../types/fileTree";
import { formatSize } from "../../utils/formatSize";
import { getFileCategory, CATEGORY_LABELS } from "../../utils/fileCategories";

interface Props {
  node: FileNode;
  parentSize: number;
  x: number;
  y: number;
}

export const TreemapTooltip: React.FC<Props> = ({ node, parentSize, x, y }) => {
  const category = getFileCategory(node.extension);
  const percent = parentSize > 0 ? ((node.size / parentSize) * 100).toFixed(1) : "0";

  return (
    <div
      className="fixed z-50 pointer-events-none bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 shadow-xl text-sm max-w-xs"
      style={{ left: x + 12, top: y + 12 }}
    >
      <div className="font-bold text-white truncate">{node.name}</div>
      <div className="text-gray-400 text-xs truncate mt-0.5">{node.path}</div>
      <div className="mt-1.5 space-y-0.5">
        <div className="text-gray-300">
          Size: <span className="text-white font-medium">{formatSize(node.size)}</span>
        </div>
        {!node.isDir && (
          <div className="text-gray-300">
            Type: <span className="text-white">{CATEGORY_LABELS[category]}</span>
          </div>
        )}
        {node.isDir && (
          <div className="text-gray-300">
            Items: <span className="text-white">{node.childCount}</span>
          </div>
        )}
        <div className="text-gray-300">
          Parent share: <span className="text-white">{percent}%</span>
        </div>
      </div>
    </div>
  );
};
