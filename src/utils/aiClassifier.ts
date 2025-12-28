import { OpenAI } from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface RelevanceResponse {
  doc_relevant: boolean;
  confidence: number;
  reason: string;
}

export async function classifyDocRelevance(
  files: { filename: string; status: string; patch: string }[]
): Promise<RelevanceResponse> {
  const filteredFiles = files.filter((f) => {
    const isIgnored = f.filename.match(/\.(png|jpg|jpeg|gif|svg|json|test\.ts|spec\.ts)$/i);
    return !isIgnored;
  });

  if (filteredFiles.length === 0) {
    return {
      doc_relevant: false,
      confidence: 1.0,
      reason: "No code-related files changed.",
    };
  }

  const prompt = `
    Analyze these GitHub PR changes. Determine if they require documentation updates.
    Return ONLY a JSON object with: 
    "doc_relevant": boolean, "confidence": number, "reason": string

    Changes: ${JSON.stringify(filteredFiles.map(f => ({ 
      file: f.filename, 
      patch: f.patch.substring(0, 1000) 
    })))}
  `;

  try {
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are a PR auditor. Output strict JSON." },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0,
    });

    const result = JSON.parse(response.choices[0].message?.content || "{}");

    return {
      doc_relevant: Boolean(result.doc_relevant ?? result.docRelevant ?? false),
      confidence: Number(result.confidence ?? 0),
      reason: String(result.reason || "No reason provided"),
    };
  } catch (err) {
    console.error("[AI Error]", err);
    return { doc_relevant: false, confidence: 0, reason: "Classification failed" };
  }
}