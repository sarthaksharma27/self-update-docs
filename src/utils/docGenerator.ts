// utils/docGenerator.ts
import OpenAI from "openai";
import { DiffSummary } from "./diffSummary";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function generateDocUpdate(
  diffSummary: DiffSummary,
  contextBlocks: string[]
): Promise<string> {
  const prompt = `
You are a technical documentation assistant.

You MUST follow these rules strictly:
1. Only document endpoints or features explicitly mentioned in:
   - CHANGES IN PULL REQUEST
   - EXISTING SYSTEM CONTEXT
2. DO NOT invent functionality, behavior, responses, or intent.
3. If information is missing or unclear, say:
   "Details not yet documented."
4. DO NOT describe endpoints that are not listed as added or modified.
5. Be factual and conservative. Accuracy is more important than completeness.

EXISTING SYSTEM CONTEXT (ground truth):
${contextBlocks.length > 0 ? contextBlocks.join("\n\n") : "No existing documentation context available."}

CHANGES IN PULL REQUEST (ground truth):
${JSON.stringify(diffSummary, null, 2)}

TASK:
Write documentation updates for the user-facing changes.

FORMAT REQUIREMENTS:
- Use Markdown
- One section per endpoint
- Include only what can be supported by the provided context
- Prefer short, precise descriptions
`;

  const response = await client.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [
      {
        role: "system",
        content:
          "You generate conservative, factual technical documentation. You never guess.",
      },
      { role: "user", content: prompt },
    ],
    temperature: 0.1, // even lower = more conservative
  });

  const text = response.choices?.[0]?.message?.content;

  return text || "";
}
