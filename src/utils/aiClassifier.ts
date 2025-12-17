import { OpenAI } from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function extractJson(text: string) {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) {
    throw new Error("No JSON found in model output");
  }
  return JSON.parse(match[0]);
}

export async function classifyDocRelevance(files: {
  filename: string;
  status: string;
  patch: string;
}[]) {
  const prompt = `
You are analyzing a GitHub Pull Request.

Decide whether these changes require documentation updates.

A PR is documentation-relevant if it changes:
- Public APIs or endpoints
- Request or response shapes
- Auth, config, or CLI behavior

Internal refactors, tests, comments, or formatting changes do NOT count.

Respond ONLY with valid JSON in this format:

{
  "doc_relevant": boolean,
  "reason": string,
  "confidence": number
}

Changed files:
${JSON.stringify(files, null, 2)}
`;

  const response = await client.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [
      { role: "system", content: "You are a PR relevance classifier." },
      { role: "user", content: prompt },
    ],
    temperature: 0.0,
    max_tokens: 200,
  });

  const rawText = response.choices[0].message?.content || "";

  console.log("RAW AI OUTPUT:\n", rawText);

  try {
    return extractJson(rawText);
  } catch (err) {
    console.error("Failed to parse AI output");

    return {
      doc_relevant: false,
      reason: "Failed to parse model output",
      confidence: 0,
    };
  }
}
