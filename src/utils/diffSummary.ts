export type ChangeDetail = {
  summary: string;
  patchLine: string;
};

export type DiffSummary = {
  apiChanges: ChangeDetail[];
  behaviorChanges: ChangeDetail[];
  configChanges: ChangeDetail[];
  generalChanges: ChangeDetail[]; // Added fallback for "other" changes
  touchedFiles: string[];
};

export function summarizeDiff(files: {
  filename: string;
  status: string;
  patch?: string;
}[]): DiffSummary {
  const apiChanges = new Map<string, ChangeDetail>();
  const behaviorChanges = new Map<string, ChangeDetail>();
  const configChanges = new Map<string, ChangeDetail>();
  const generalChanges = new Map<string, ChangeDetail>();
  const touchedFiles = new Set<string>();

  for (const file of files) {
    touchedFiles.add(file.filename);

    // SENIOR TIP: If patch is missing, it might be a binary file or a very large diff.
    // We should at least log that the file changed.
    if (!file.patch) {
      generalChanges.set(file.filename, {
        summary: `File modified (no patch data available)`,
        patchLine: `Status: ${file.status}`
      });
      continue;
    }

    const lines = file.patch.split("\n");

    for (const line of lines) {
      if (!line.startsWith("+") && !line.startsWith("-")) continue;
      if (line.startsWith("+++") || line.startsWith("---")) continue;

      const content = line.slice(1).trim();
      if (!content) continue; // Skip empty changed lines

      const changePrefix = line.startsWith("+") ? "Added" : "Removed";
      let matched = false;

      // 1. API Changes
      const urlRegex = /["'`](\/[a-zA-Z0-9\/\-_:{}]+)["'`]/;
      const urlMatch = urlRegex.exec(content);
      if (urlMatch) {
        apiChanges.set(content, { summary: `${changePrefix} route ${urlMatch[1]}`, patchLine: line });
        matched = true;
      }

      // 2. Config Changes (Added YAML/JSON support for docker/config files)
      if (
        content.includes("process.env.") || 
        file.filename.match(/\.(yaml|yml|json|env)$/i) ||
        file.filename.includes("config")
      ) {
        configChanges.set(content, { summary: `Config change in ${file.filename}`, patchLine: line });
        matched = true;
      }

      // 3. Behavior Changes
      if (/(if\s*\(|throw\s+|return\s+|new\s+|await\s+)/.test(content)) {
        behaviorChanges.set(content, { summary: `Logic change in ${file.filename}`, patchLine: line });
        matched = true;
      }

      // 4. Fallback: If it's a code change but didn't match our filters, keep it anyway
      if (!matched) {
        generalChanges.set(content, { summary: `Line updated in ${file.filename}`, patchLine: line });
      }
    }
  }

  return {
    apiChanges: Array.from(apiChanges.values()),
    behaviorChanges: Array.from(behaviorChanges.values()),
    configChanges: Array.from(configChanges.values()),
    generalChanges: Array.from(generalChanges.values()),
    touchedFiles: Array.from(touchedFiles),
  };
}