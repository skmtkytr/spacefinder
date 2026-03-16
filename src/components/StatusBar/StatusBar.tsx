import React from "react";
import { useAppStore } from "../../store/appStore";
import { formatSize } from "../../utils/formatSize";

export const StatusBar: React.FC = () => {
  const { scanStatus, scanProgress, rootNode, diskInfo } = useAppStore();

  return (
    <div className="flex items-center px-4 py-1.5 bg-gray-800 border-t border-gray-700 text-xs text-gray-400 gap-4">
      <div>
        {scanStatus === "idle" && "Ready"}
        {scanStatus === "scanning" && "Scanning..."}
        {scanStatus === "complete" && "Scan complete"}
        {scanStatus === "error" && "Scan error"}
      </div>

      {(scanStatus === "complete" && rootNode) && (
        <>
          <div className="h-3 w-px bg-gray-600" />
          <div>
            <span className="font-medium text-gray-300">{rootNode.childCount.toLocaleString()}</span> items |{" "}
            <span className="font-medium text-gray-300">{formatSize(rootNode.size)}</span>
          </div>
        </>
      )}

      {scanStatus === "scanning" && scanProgress && (
        <>
          <div className="h-3 w-px bg-gray-600" />
          <div>
            {scanProgress.filesScanned.toLocaleString()} files |{" "}
            {scanProgress.dirsScanned.toLocaleString()} dirs |{" "}
            {formatSize(scanProgress.totalSize)}
          </div>
        </>
      )}

      <div className="flex-1" />

      {diskInfo && (
        <div className="flex items-center gap-2">
          <span>
            Disk: {formatSize(diskInfo.usedSpace)} / {formatSize(diskInfo.totalSpace)}
          </span>
          <div className="w-24 h-2 bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${diskInfo.usagePercent}%`,
                backgroundColor:
                  diskInfo.usagePercent > 90
                    ? "#e74c3c"
                    : diskInfo.usagePercent > 70
                      ? "#f39c12"
                      : "#2ecc71",
              }}
            />
          </div>
          <span>{diskInfo.usagePercent.toFixed(1)}%</span>
        </div>
      )}
    </div>
  );
};
