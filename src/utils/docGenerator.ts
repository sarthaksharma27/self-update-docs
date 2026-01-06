import OpenAI from "openai";
import { getRelevantContext } from "./contextRetriver";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function generateDocUpdate(
  repoId: string,
  diffSummary: any,
  existingDocContent: string = ""
): Promise<string> {
  const contextBlocks = await getRelevantContext(repoId, diffSummary);
  const isUpdate = existingDocContent.length > 0;

  const prompt = `
### PERSONA
Staff Technical Writer. Expertise: MDX, Mintlify, Stripe-style API docs.

### TASK
${isUpdate ? "SURGICALLY EDIT existing MDX documentation." : "CREATE NEW MDX documentation."}

### INPUT
1. **EXISTING MDX:** \n${isUpdate ? existingDocContent : "EMPTY"}
2. **CODE CONTEXT:** \n${contextBlocks.join("\n---\n")}
3. **PR DIFF:** \n${JSON.stringify(diffSummary)}

### RULES
- OUTPUT FULL MDX CONTENT ONLY.
- DO NOT add "PR summaries" or "AI generated" text.
- If /upload changed to /upload/v2, update the existing path in the MDX.
- Preserve all existing MDX imports and manual explanations.
- Return raw MDX. No conversation. No backticks.
`;

  const response = await client.chat.completions.create({
    model: "gpt-4o", // Senior Tip: Always use the higher model for surgical edits
    messages: [{ role: "system", content: "You are a precise technical editor." }, { role: "user", content: prompt }],
    temperature: 0,
  });

  let content = response.choices?.[0]?.message?.content || "";
  return content.replace(/^```[a-z]*\n/i, "").replace(/\n```$/i, "").trim();
}