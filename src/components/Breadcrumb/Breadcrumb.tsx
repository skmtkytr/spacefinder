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
    <div className="flex items-center px-4 py-1.5 bg-gray-800/80 border-b border-gray-700 text-sm overflow-x-auto whitespace-nowrap">
      {segments.map((segment, index) => (
        <React.Fragment key={index}>
          {index > 0 && <span className="mx-1.5 text-gray-500">/</span>}
          <button
            onClick={() => navigateToIndex(index)}
            className={`px-1.5 py-0.5 rounded hover:bg-gray-700 transition-colors ${
              index === segments.length - 1
                ? "text-white font-medium"
                : "text-gray-400 hover:text-gray-200"
            }`}
          >
            {segment}
          </button>
        </React.Fragment>
      ))}
    </div>
  );
};
