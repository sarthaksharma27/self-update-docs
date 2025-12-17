// utils/diffSummary.ts

export type DiffSummary = {
  addedEndpoints: string[];
  modifiedEndpoints: string[];
  touchedFiles: string[];
};

export function summarizeDiff(files: {
  filename: string;
  status: string;
  patch: string;
}[]): DiffSummary {
  const addedEndpoints = new Set<string>();
  const modifiedEndpoints = new Set<string>();
  const touchedFiles = new Set<string>();

  for (const file of files) {
    touchedFiles.add(file.filename);

    if (!file.patch) continue;

    // Very naive Express-style route detection
    const routeRegex =
      /router\.(get|post|put|delete)\(\s*["'`](.*?)["'`]/gi;

    let match;
    while ((match = routeRegex.exec(file.patch)) !== null) {
      const method = match[1].toUpperCase();
      const path = match[2];
      const endpoint = `${method} ${path}`;

      // If file is newly added OR diff contains "+"
      if (file.status === "added" || file.patch.includes(`+router.${match[1]}`)) {
        addedEndpoints.add(endpoint);
      } else {
        modifiedEndpoints.add(endpoint);
      }
    }
  }

  return {
    addedEndpoints: Array.from(addedEndpoints),
    modifiedEndpoints: Array.from(modifiedEndpoints),
    touchedFiles: Array.from(touchedFiles),
  };
}
