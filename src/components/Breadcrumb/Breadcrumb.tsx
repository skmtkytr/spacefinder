import React from "react";
import { useAppStore } from "../../store/appStore";

export const Breadcrumb: React.FC = () => {
  const { pathStack, navigateToIndex } = useAppStore();

  if (pathStack.length === 0) return null;

  // Extract meaningful segments from the path stack
  const segments = pathStack.map((fullPath) => {
    const parts = fullPath.split("/");
    return parts[parts.length - 1] || fullPath;
  });

  return (
    <div className="flex items-center px-4 py-2 bg-gray-800/80 border-b border-gray-700 text-sm overflow-x-auto whitespace-nowrap">
      {segments.map((segment, index) => (
        <React.Fragment key={index}>
          {index > 0 && <span className="mx-1.5 text-gray-500">›</span>}
          <button
            onClick={() => navigateToIndex(index)}
            className={`px-2 py-0.5 rounded transition-colors ${
              index === segments.length - 1
                ? "text-white font-medium bg-gray-700/50"
                : "text-gray-400 hover:text-gray-200 hover:bg-gray-700"
            }`}
          >
            {segment}
          </button>
        </React.Fragment>
      ))}
    </div>
  );
};
