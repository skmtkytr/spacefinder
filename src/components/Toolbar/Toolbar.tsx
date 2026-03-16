import React, { useState } from "react";
import { useScanner } from "../../hooks/useScanner";
import { useAppStore } from "../../store/appStore";
import { FilterPanel } from "./FilterPanel";

export const Toolbar: React.FC = () => {
  const { openAndScan, rescan, scanStatus } = useScanner();
  const { navigateUp, pathStack } = useAppStore();
  const [showFilters, setShowFilters] = useState(false);
  const isScanning = scanStatus === "scanning";
  const hasData = scanStatus === "complete";

  return (
    <div>
      <div className="flex items-center gap-2 px-4 py-2 bg-gray-800 border-b border-gray-700">
        <button
          onClick={openAndScan}
          disabled={isScanning}
          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-sm font-medium rounded transition-colors"
        >
          Open Folder
        </button>
        <button
          onClick={rescan}
          disabled={isScanning || !hasData}
          className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed text-gray-200 text-sm rounded transition-colors"
        >
          Re-scan
        </button>
        <button
          onClick={navigateUp}
          disabled={pathStack.length <= 1}
          className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed text-gray-200 text-sm rounded transition-colors"
        >
          Up
        </button>
        <div className="flex-1" />
        {hasData && (
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-3 py-1.5 text-sm rounded transition-colors ${
              showFilters
                ? "bg-blue-600 text-white"
                : "bg-gray-700 hover:bg-gray-600 text-gray-200"
            }`}
          >
            Filters
          </button>
        )}
      </div>
      {showFilters && hasData && <FilterPanel />}
    </div>
  );
};
