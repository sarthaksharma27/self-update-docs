export function isIndexableFile(path: string) {
  // Only index common code files
  return /\.(js|ts|py|java|go|cpp|c|rb|rs)$/.test(path);
}