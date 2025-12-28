import OpenAI from "openai";
import { getRelevantContext } from "./contextRetriver";

const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export async function generateDocUpdate(
    repoId: string,
    diffSummary: any
): Promise<string> {
    const contextBlocks = await getRelevantContext(repoId, diffSummary);

    const prompt = `
### PERSONA
You are a Staff Technical Writer and Senior Software Architect.

### INPUT DATA
1. **EXISTING SYSTEM CONTEXT (Codebase Snippets):**
${contextBlocks.length > 0 ? contextBlocks.join("\n\n---\n\n") : "No direct context found; rely on the PR diff logic."}

2. **PULL REQUEST DIFF SUMMARY:**
${JSON.stringify(diffSummary, null, 2)}

### INSTRUCTIONS
1. **Synthesize:** Explain how these changes fit into the existing architecture.
2. **Professional Tone:** Write in a clear technical style (Stripe/AWS style).

### OUTPUT FORMAT
- Markdown format.
- **Title**, **Description**, and **Details** (bullet points).
`;

    const response = await client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
            { 
                role: "system", 
                content: "You are an expert technical architect. You bridge the gap between 'what changed' and 'how it works'." 
            },
            { role: "user", content: prompt },
        ],
        temperature: 0.2,
    });

    return response.choices?.[0]?.message?.content || "";
}