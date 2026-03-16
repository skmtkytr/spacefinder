import React, { useState, useEffect } from "react";
import { useAppStore } from "../../store/appStore";
import {
  CATEGORY_LABELS,
  type FileCategory,
} from "../../utils/fileCategories";
import { CATEGORY_COLORS } from "../../utils/colorScale";

const ALL_CATEGORIES: FileCategory[] = [
  "image",
  "video",
  "audio",
  "document",
  "code",
  "archive",
  "executable",
  "font",
  "data",
  "other",
];

export const FilterPanel: React.FC = () => {
  const { filters, setFilters, resetFilters } = useAppStore();
  const [nameInput, setNameInput] = useState(filters.namePattern);
  const [sizeInput, setSizeInput] = useState(
    filters.minSize > 0 ? String(filters.minSize) : "",
  );

  // Debounced name filter
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters({ namePattern: nameInput });
    }, 300);
    return () => clearTimeout(timer);
  }, [nameInput, setFilters]);

  // Debounced size filter
  useEffect(() => {
    const timer = setTimeout(() => {
      const val = parseFloat(sizeInput);
      setFilters({ minSize: isNaN(val) ? 0 : val });
    }, 300);
    return () => clearTimeout(timer);
  }, [sizeInput, setFilters]);

  const toggleCategory = (cat: FileCategory) => {
    const current = filters.selectedCategories;
    const next = current.includes(cat)
      ? current.filter((c) => c !== cat)
      : [...current, cat];
    setFilters({ selectedCategories: next });
  };

  const hasFilters =
    filters.namePattern || filters.minSize > 0 || filters.selectedCategories.length > 0;

  return (
    <div className="px-4 py-2 bg-gray-800/60 border-b border-gray-700 space-y-2">
      <div className="flex items-center gap-3">
        <input
          type="text"
          placeholder="Filter by name..."
          value={nameInput}
          onChange={(e) => setNameInput(e.target.value)}
          className="px-2.5 py-1 bg-gray-700 border border-gray-600 rounded text-sm text-white placeholder-gray-400 w-48 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/40"
        />
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-gray-400">Min:</span>
          <input
            type="number"
            placeholder="MB"
            value={sizeInput}
            onChange={(e) => setSizeInput(e.target.value)}
            className="px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm text-white placeholder-gray-400 w-20 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/40"
            min={0}
            step={1}
          />
          <span className="text-xs text-gray-400">MB</span>
        </div>
        {hasFilters && (
          <button
            onClick={() => {
              resetFilters();
              setNameInput("");
              setSizeInput("");
            }}
            className="px-2 py-1 text-xs bg-red-900/50 hover:bg-red-800/50 text-red-300 rounded transition-colors"
          >
            Reset
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {ALL_CATEGORIES.map((cat) => {
          const active = filters.selectedCategories.includes(cat);
          return (
            <button
              key={cat}
              onClick={() => toggleCategory(cat)}
              className={`px-2 py-0.5 text-xs rounded-full border transition-all duration-200 ${
                active
                  ? "text-white border-transparent"
                  : "text-gray-400 border-gray-600 hover:border-gray-500"
              }`}
              style={
                active
                  ? { backgroundColor: CATEGORY_COLORS[cat], borderColor: CATEGORY_COLORS[cat] }
                  : {}
              }
            >
              {CATEGORY_LABELS[cat]}
            </button>
          );
        })}
      </div>
    </div>
  );
};
