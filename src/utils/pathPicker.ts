import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function determineTargetPath(
  docsConfig: string, 
  files: { filename: string }[]
): Promise<string> {
  const prompt = `
    You are a Technical Document Architect.
    
    TASK: Determine the best file path in a documentation repository for these code changes.
    
    DOCS STRUCTURE (JSON):
    ${docsConfig || "No existing structure (docs.json) found."}

    CODE FILES CHANGED:
    ${files.map(f => f.filename).join(", ")}

    RULES:
    1. If the change belongs in an existing documentation page (based on the structure), return that path.
    2. If it is a new feature, suggest a logical path (e.g., 'api-reference/new-endpoint.md').
    3. Return ONLY the file path (e.g., 'api/health.md'). No prose, no markdown blocks.
  `;

  try {
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0,
    });

    // Senior move: Clean the string in case the AI added backticks or quotes
    return response.choices[0].message?.content?.replace(/[`"']/g, '').trim() || "updates/changelog.md";
  } catch (err) {
    console.error("Path determination failed:", err);
    return "updates/auto-generated.md";
  }
}