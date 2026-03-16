export type FileCategory =
  | "image"
  | "video"
  | "audio"
  | "document"
  | "code"
  | "archive"
  | "executable"
  | "font"
  | "data"
  | "other";

const EXTENSION_MAP: Record<string, FileCategory> = {
  // Images
  jpg: "image", jpeg: "image", png: "image", gif: "image", bmp: "image",
  svg: "image", webp: "image", ico: "image", tiff: "image", tif: "image",
  heic: "image", heif: "image", raw: "image", cr2: "image", nef: "image",
  // Video
  mp4: "video", avi: "video", mkv: "video", mov: "video", wmv: "video",
  flv: "video", webm: "video", m4v: "video", mpg: "video", mpeg: "video",
  // Audio
  mp3: "audio", wav: "audio", flac: "audio", aac: "audio", ogg: "audio",
  wma: "audio", m4a: "audio", opus: "audio", aiff: "audio",
  // Documents
  pdf: "document", doc: "document", docx: "document", xls: "document",
  xlsx: "document", ppt: "document", pptx: "document", txt: "document",
  rtf: "document", odt: "document", ods: "document", csv: "document",
  md: "document", epub: "document",
  // Code
  js: "code", ts: "code", jsx: "code", tsx: "code", py: "code",
  rs: "code", go: "code", java: "code", c: "code", cpp: "code",
  h: "code", hpp: "code", cs: "code", rb: "code", php: "code",
  swift: "code", kt: "code", scala: "code", html: "code", css: "code",
  scss: "code", less: "code", vue: "code", svelte: "code", sql: "code",
  sh: "code", bash: "code", zsh: "code", fish: "code", toml: "code",
  yaml: "code", yml: "code", json: "code", xml: "code",
  // Archives
  zip: "archive", rar: "archive", "7z": "archive", tar: "archive",
  gz: "archive", bz2: "archive", xz: "archive", zst: "archive",
  dmg: "archive", iso: "archive",
  // Executables
  exe: "executable", msi: "executable", app: "executable", deb: "executable",
  rpm: "executable", apk: "executable", bin: "executable",
  // Fonts
  ttf: "font", otf: "font", woff: "font", woff2: "font", eot: "font",
  // Data
  db: "data", sqlite: "data", sqlite3: "data", mdb: "data",
  parquet: "data", arrow: "data",
};

export function getFileCategory(extension: string | null): FileCategory {
  if (!extension) return "other";
  return EXTENSION_MAP[extension.toLowerCase()] ?? "other";
}

export const CATEGORY_LABELS: Record<FileCategory, string> = {
  image: "Images",
  video: "Videos",
  audio: "Audio",
  document: "Documents",
  code: "Code",
  archive: "Archives",
  executable: "Executables",
  font: "Fonts",
  data: "Databases",
  other: "Other",
};
