import { useState, useCallback, useImperativeHandle, forwardRef } from "react";
import { useScanner } from "../../hooks/useScanner";
import { useAppStore } from "../../store/appStore";
import { FilterPanel } from "./FilterPanel";

const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
const modKey = isMac ? "\u2318" : "Ctrl+";

export interface ToolbarHandle {
  toggleFilters: () => void;
}

export const Toolbar = forwardRef<ToolbarHandle>((_props, ref) => {
  const { openAndScan, rescan, scanStatus } = useScanner();
  const { navigateUp, pathStack } = useAppStore();
  const [showFilters, setShowFilters] = useState(false);
  const isScanning = scanStatus === "scanning";
  const hasData = scanStatus === "complete";

  const toggleFilters = useCallback(() => {
    setShowFilters((prev) => !prev);
  }, []);

  useImperativeHandle(ref, () => ({ toggleFilters }), [toggleFilters]);

  return (
    <div>
      <div className="flex items-center gap-2 px-4 py-2 bg-gray-800 border-b border-gray-700">
        <button
          onClick={openAndScan}
          disabled={isScanning}
          title={`Open Folder (${modKey}O)`}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 hover:shadow-md disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-sm font-medium rounded transition-all"
        >
          {isScanning ? (
            <span className="animate-pulse-dot inline-block w-2 h-2 rounded-full bg-blue-300" />
          ) : (
            <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 3h4l2 2h6v8H2z" />
            </svg>
          )}
          {isScanning ? "Scanning..." : "Open Folder"}
        </button>
        <button
          onClick={rescan}
          disabled={isScanning || !hasData}
          title={`Re-scan (${modKey}R)`}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 hover:shadow-md disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed text-gray-200 text-sm rounded transition-all"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 8a6 6 0 0 1 10.2-4.2M14 2v4h-4" />
            <path d="M14 8a6 6 0 0 1-10.2 4.2M2 14v-4h4" />
          </svg>
          Re-scan
        </button>
        <button
          onClick={navigateUp}
          disabled={pathStack.length <= 1}
          title="Up (Backspace)"
          className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 hover:shadow-md disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed text-gray-200 text-sm rounded transition-all"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 12V4M4 7l4-3 4 3" />
          </svg>
          Up
        </button>
        <div className="flex-1" />
        {hasData && (
          <button
            onClick={toggleFilters}
            title={`Filters (${modKey}F)`}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded transition-all hover:shadow-md ${
              showFilters
                ? "bg-blue-600 text-white"
                : "bg-gray-700 hover:bg-gray-600 text-gray-200"
            }`}
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 3h12l-4 5v4l-4 1V8z" />
            </svg>
            Filters
          </button>
        )}
      </div>
      {showFilters && hasData && <FilterPanel />}
    </div>
  );
});

Toolbar.displayName = "Toolbar";
