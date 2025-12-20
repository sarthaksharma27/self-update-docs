import OpenAI from "openai";
import { DiffSummary } from "./diffSummary";
import { getRelevantContext } from "./contextRetriver";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function generateDocUpdate(
  installationId: number,
  diffSummary: DiffSummary
): Promise<string> {
  const contextBlocks = await getRelevantContext(diffSummary);

  const prompt = `
### PERSONA
You are a Staff Technical Writer and Senior Software Architect. Your goal is to produce high-quality, developer-facing documentation updates.

### INPUT DATA
1. **EXISTING SYSTEM CONTEXT (Codebase Snippets):**
${contextBlocks.length > 0 ? contextBlocks.join("\n\n---\n\n") : "No direct context found; rely on the PR diff logic."}

2. **PULL REQUEST DIFF SUMMARY:**
${JSON.stringify(diffSummary, null, 2)}

### INSTRUCTIONS
1. **Analyze & Correlate:** Synthesize the "Existing Context" with the "PR Changes." Use your intelligence to explain *how* the new changes integrate into the existing architecture.
2. **Technical Depth:** If the context shows specific patterns (like error handling, middleware, or specific decorators), ensure the documentation reflects that these patterns were followed or modified.
3. **Internal vs External:** Distinguish between internal logic changes and user-facing API/feature changes. Focus the documentation on the impact of the change.
4. **Professional Tone:** Write in a clear, authoritative, and concise technical style (similar to Stripe or AWS docs).

### OUTPUT FORMAT
- Use clean Markdown.
- **Title**: A concise summary of the update.
- **Description**: A "Why" and "How" for the change.
- **Details**: Bullet points for specific API changes, logic shifts, or configuration updates.
- If information is missing, use your reasoning to describe the most likely behavior based on standard engineering principles, but label it as a "Note."
`;

  const response = await client.chat.completions.create({
    model: "gpt-4-turbo-preview",
    messages: [
      { 
        role: "system", 
        content: "You are an expert technical architect. You synthesize code changes into beautiful, accurate documentation. You bridge the gap between 'what changed' and 'how it works'." 
      },
      { role: "user", content: prompt },
    ],
    temperature: 0.3,
  });

  return response.choices?.[0]?.message?.content || "";
}