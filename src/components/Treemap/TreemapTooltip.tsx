import React, { useRef, useLayoutEffect, useState } from "react";
import type { FileNode } from "../../types/fileTree";
import { formatSize } from "../../utils/formatSize";
import { getFileCategory, CATEGORY_LABELS } from "../../utils/fileCategories";
import { CATEGORY_COLORS } from "../../utils/colorScale";

interface Props {
  node: FileNode;
  parentSize: number;
  x: number;
  y: number;
}

export const TreemapTooltip: React.FC<Props> = ({ node, parentSize, x, y }) => {
  const category = getFileCategory(node.extension);
  const percent = parentSize > 0 ? ((node.size / parentSize) * 100).toFixed(1) : "0";
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ left: x + 12, top: y + 12 });

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const pad = 8;
    let left = x + 12;
    let top = y + 12;
    if (left + rect.width > window.innerWidth - pad) {
      left = x - rect.width - 12;
    }
    if (top + rect.height > window.innerHeight - pad) {
      top = y - rect.height - 12;
    }
    if (left < pad) left = pad;
    if (top < pad) top = pad;
    setPos({ left, top });
  }, [x, y]);

  return (
    <div
      ref={ref}
      className="fixed z-50 pointer-events-none backdrop-blur-sm bg-gray-900/90 border border-gray-600 rounded-lg px-3 py-2 shadow-xl text-sm max-w-xs"
      style={{ left: pos.left, top: pos.top }}
    >
      <div className="font-bold text-white truncate">{node.name}</div>
      <div className="text-gray-300 text-xs truncate mt-0.5">{node.path}</div>
      <div className="mt-1.5 space-y-0.5">
        <div className="text-gray-300">
          Size: <span className="text-white font-medium">{formatSize(node.size)}</span>
        </div>
        {!node.isDir && (
          <div className="text-gray-300 flex items-center gap-1.5">
            Type:
            <span
              className="inline-block w-2 h-2 rounded-full"
              style={{ backgroundColor: CATEGORY_COLORS[category] }}
            />
            <span className="text-white">{CATEGORY_LABELS[category]}</span>
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
