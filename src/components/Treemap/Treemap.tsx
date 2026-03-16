import React, { useRef, useState, useCallback, useEffect } from "react";
import { useTreemap, type TreemapNode } from "../../hooks/useTreemap";
import { TreemapTooltip } from "./TreemapTooltip";
import { useAppStore } from "../../store/appStore";
import { getFileCategory } from "../../utils/fileCategories";
import { getNodeColor } from "../../utils/colorScale";
import { formatSize } from "../../utils/formatSize";
import type { FileNode } from "../../types/fileTree";

interface Props {
  onContextMenu: (e: React.MouseEvent, node: FileNode) => void;
}

export const Treemap: React.FC<Props> = ({ onContextMenu }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [tooltip, setTooltip] = useState<{
    node: FileNode;
    parentSize: number;
    x: number;
    y: number;
  } | null>(null);

  const { navigateTo, scanStatus, scanProgress } = useAppStore();
  const { layoutNodes, currentNode } = useTreemap(
    dimensions.width,
    dimensions.height,
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setDimensions({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  const handleClick = useCallback(
    (node: TreemapNode) => {
      if (node.data.isDir && node.data.children.length > 0) {
        navigateTo(node.data.path);
      }
    },
    [navigateTo],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent, node: TreemapNode) => {
      setTooltip({
        node: node.data,
        parentSize: currentNode?.size ?? 0,
        x: e.clientX,
        y: e.clientY,
      });
    },
    [currentNode],
  );

  const handleMouseLeave = useCallback(() => {
    setTooltip(null);
  }, []);

  const renderContent = () => {
    if (scanStatus === "idle") {
      return (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center text-gray-400">
            <div className="text-5xl mb-4">&#128193;</div>
            <div className="text-xl font-medium">Open a folder to get started</div>
            <div className="text-sm mt-2">
              Click "Open Folder" in the toolbar above
            </div>
          </div>
        </div>
      );
    }

    if (scanStatus === "scanning") {
      return (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center text-gray-300">
            <div className="animate-spin text-4xl mb-4">&#9881;</div>
            <div className="text-lg font-medium">Scanning...</div>
            {scanProgress && (
              <div className="mt-3 space-y-1 text-sm text-gray-400">
                <div>
                  Files: {scanProgress.filesScanned.toLocaleString()} | Dirs:{" "}
                  {scanProgress.dirsScanned.toLocaleString()}
                </div>
                <div>Size: {formatSize(scanProgress.totalSize)}</div>
                <div className="truncate max-w-md">{scanProgress.currentPath}</div>
              </div>
            )}
          </div>
        </div>
      );
    }

    if (scanStatus === "error") {
      return (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center text-red-400">
            <div className="text-4xl mb-4">&#9888;</div>
            <div className="text-lg">Scan failed. Try again.</div>
          </div>
        </div>
      );
    }

    return (
      <>
        <svg width={dimensions.width} height={dimensions.height}>
          {layoutNodes.map((node, i) => {
            const w = node.x1 - node.x0;
            const h = node.y1 - node.y0;
            if (w < 1 || h < 1) return null;

            const category = getFileCategory(node.data.extension);
            const color = getNodeColor(node.data.name, node.data.isDir, category);
            const showLabel = w > 40 && h > 16;
            const showSize = w > 60 && h > 30;
            const isDir = node.data.isDir && node.depth > 0;

            return (
              <g
                key={node.data.path + i}
                onClick={() => handleClick(node)}
                onMouseMove={(e) => handleMouseMove(e, node)}
                onMouseLeave={handleMouseLeave}
                onContextMenu={(e) => {
                  e.preventDefault();
                  onContextMenu(e, node.data);
                }}
                style={{ cursor: node.data.isDir ? "pointer" : "default" }}
              >
                <rect
                  x={node.x0}
                  y={node.y0}
                  width={w}
                  height={h}
                  fill={color}
                  stroke={node.depth === 0 ? "transparent" : "#1a1a2e"}
                  strokeWidth={node.data.isDir ? 1.5 : 0.5}
                  opacity={isDir ? 0.7 : 0.9}
                  rx={node.data.isDir ? 2 : 1}
                />
                {isDir && showLabel && (
                  <text
                    x={node.x0 + 4}
                    y={node.y0 + 14}
                    fontSize={11}
                    fill="#fff"
                    fontWeight="bold"
                    opacity={0.9}
                    pointerEvents="none"
                  >
                    {node.data.name.length > w / 7
                      ? node.data.name.slice(0, Math.floor(w / 7)) + "..."
                      : node.data.name}
                  </text>
                )}
                {!node.data.isDir && showLabel && (
                  <>
                    <text
                      x={node.x0 + w / 2}
                      y={node.y0 + h / 2 - (showSize ? 4 : 0)}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fontSize={10}
                      fill="#fff"
                      pointerEvents="none"
                    >
                      {node.data.name.length > w / 6
                        ? node.data.name.slice(0, Math.floor(w / 6)) + "..."
                        : node.data.name}
                    </text>
                    {showSize && (
                      <text
                        x={node.x0 + w / 2}
                        y={node.y0 + h / 2 + 10}
                        textAnchor="middle"
                        dominantBaseline="central"
                        fontSize={9}
                        fill="rgba(255,255,255,0.7)"
                        pointerEvents="none"
                      >
                        {formatSize(node.data.size)}
                      </text>
                    )}
                  </>
                )}
              </g>
            );
          })}
        </svg>
        {tooltip && (
          <TreemapTooltip
            node={tooltip.node}
            parentSize={tooltip.parentSize}
            x={tooltip.x}
            y={tooltip.y}
          />
        )}
      </>
    );
  };

  return (
    <div
      ref={containerRef}
      className="flex-1 relative overflow-hidden bg-gray-900"
    >
      {renderContent()}
    </div>
  );
};
