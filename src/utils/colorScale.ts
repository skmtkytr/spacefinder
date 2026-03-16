import type { FileCategory } from "./fileCategories";

export const CATEGORY_COLORS: Record<FileCategory, string> = {
  image: "#e74c3c",
  video: "#9b59b6",
  audio: "#f39c12",
  document: "#3498db",
  code: "#2ecc71",
  archive: "#e67e22",
  executable: "#1abc9c",
  font: "#95a5a6",
  data: "#34495e",
  other: "#7f8c8d",
};

export const DIRECTORY_COLOR = "#2c3e50";

// Generate a slight color variation based on the file name
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return hash;
}

export function getNodeColor(
  name: string,
  isDir: boolean,
  category: FileCategory,
): string {
  if (isDir) return DIRECTORY_COLOR;

  const baseColor = CATEGORY_COLORS[category];
  const hash = hashString(name);
  // Vary lightness by +/- 10%
  const variation = ((hash % 20) - 10) / 100;

  // Parse hex and adjust
  const r = parseInt(baseColor.slice(1, 3), 16);
  const g = parseInt(baseColor.slice(3, 5), 16);
  const b = parseInt(baseColor.slice(5, 7), 16);

  const adjust = (c: number) =>
    Math.max(0, Math.min(255, Math.round(c * (1 + variation))));

  const toHex = (c: number) => adjust(c).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}
