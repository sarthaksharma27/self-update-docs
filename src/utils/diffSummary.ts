export type DiffSummary = {
  apiChanges: string[];
  behaviorChanges: string[];
  configChanges: string[];
  touchedFiles: string[];
};

export function summarizeDiff(files: {
  filename: string;
  status: string;
  patch?: string;
}[]): DiffSummary {
  const apiChanges = new Set<string>();
  const behaviorChanges = new Set<string>();
  const configChanges = new Set<string>();
  const touchedFiles = new Set<string>();

  for (const file of files) {
    touchedFiles.add(file.filename);

    if (!file.patch) continue;

    const lines = file.patch.split("\n");

    for (const line of lines) {
      // We only care about actual code changes
      if (!line.startsWith("+") && !line.startsWith("-")) continue;
      if (line.startsWith("+++")) continue;
      if (line.startsWith("---")) continue;

      const content = line.slice(1).trim();

      /* =========================
         API / URL CHANGES
      ========================== */

      // Match any URL-like string (not Express-specific)
      const urlRegex = /["'`](\/[a-zA-Z0-9\/\-_:{}]+)["'`]/;
      const urlMatch = urlRegex.exec(content);

      if (urlMatch) {
        const changeType = line.startsWith("+") ? "Added" : "Removed";
        apiChanges.add(`${changeType} route ${urlMatch[1]}`);
      }

      /* =========================
         CONFIG / ENV CHANGES
      ========================== */

      if (
        content.includes("process.env.") ||
        file.filename.toLowerCase().includes("config") ||
        file.filename.endsWith(".env")
      ) {
        const changeType = line.startsWith("+") ? "Added/Updated" : "Removed";
        configChanges.add(
          `${changeType} configuration in ${file.filename}`
        );
      }

      /* =========================
         BEHAVIOR CHANGES (heuristic)
      ========================== */

      // Look for logic-affecting keywords
      if (
        /(if\s*\(|throw\s+|return\s+|new\s+|await\s+)/.test(content)
      ) {
        behaviorChanges.add(
          `Logic change in ${file.filename}`
        );
      }
    }
  }

  return {
    apiChanges: Array.from(apiChanges),
    behaviorChanges: Array.from(behaviorChanges),
    configChanges: Array.from(configChanges),
    touchedFiles: Array.from(touchedFiles),
  };
}
