export type DiffSummary = {
  addedEndpoints: string[];
  modifiedEndpoints: string[];
  touchedFiles: string[];
};

export function summarizeDiff(files: {
  filename: string;
  status: string;
  patch?: string;
}[]): DiffSummary {
  const addedEndpoints = new Set<string>();
  const modifiedEndpoints = new Set<string>();
  const touchedFiles = new Set<string>();

  for (const file of files) {
    touchedFiles.add(file.filename);

    if (!file.patch) continue;

    // Split patch into lines
    const lines = file.patch.split("\n");

    for (const line of lines) {
      // Only care about newly added lines
      if (!line.startsWith("+")) continue;

      // Ignore diff metadata (e.g. +++ b/file.ts)
      if (line.startsWith("+++")) continue;

      // Match Express-style routes ONLY on added lines
      const routeRegex =
        /router\.(get|post|put|delete)\(\s*["'`](.*?)["'`]/i;

      const match = routeRegex.exec(line);
      if (!match) continue;

      const method = match[1].toUpperCase();
      const path = match[2];
      const endpoint = `${method} ${path}`;

      // If the whole file is new → definitely added
      if (file.status === "added") {
        addedEndpoints.add(endpoint);
      } else {
        // For modified files, added route = new endpoint
        addedEndpoints.add(endpoint);
      }
    }
  }

  return {
    addedEndpoints: Array.from(addedEndpoints),
    modifiedEndpoints: Array.from(modifiedEndpoints),
    touchedFiles: Array.from(touchedFiles),
  };
}
