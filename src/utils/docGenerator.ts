import OpenAI from "openai";
import { getRelevantContext } from "./contextRetriver";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function generateDocUpdate(
  repoId: string,
  diffSummary: any,
  existingDocContent: string = ""
): Promise<string> {
  // 1. Fetch Context (Types, Schemas, Related Logic)
  const contextBlocks = await getRelevantContext(repoId, diffSummary);
  const isUpdate = existingDocContent.length > 0;

  // 2. The Senior Technical Writer Persona & Style Guide
  const systemPrompt = `
### ROLE
You are a Staff Technical Writer for a developer platform. You write "Stripe-quality" MDX documentation. 
Your docs are clean, precise, and use specific UI components for readability.

### STYLE GUIDE (STRICT ADHERENCE REQUIRED)
You must structure your output using this exact hierarchy and component set:

1. **Hierarchy**:
   - \`# Title\`
   - \`## Overview\` (1-2 sentences explaining what this feature/endpoint does)
   - \`## Endpoint\` (For API routes)
   - \`### Request\` (Method, URL, Headers)
   - \`#### Parameters\` (Use <ParamField> component)
   - \`### Response\` (Status codes, JSON example)
   - \`## Usage Example\` (cURL or JS snippet)

2. **Components**:
   - **Parameters**: Use \`<ParamField name="arg_name" type="string" required={true}>Description</ParamField>\`
   - **Warnings**: Use \`<Warning>Text</Warning>\` for deprecations or breaking changes.
   - **Notes**: Use \`<Note>Text</Note>\` for constraints (e.g., Auth required, limits).
   - **Callouts**: Use \`<Callout>Text</Callout>\` for tips.

3. **Formatting**:
   - JSON responses must be multi-line and indented (2 spaces).
   - Code blocks must have language tags (e.g., \`\`\`json, \`\`\`bash).

### INTENT LOGIC
- **Deprecation**: If a route changed from v1 to v2, add a <Warning> at the very top.
- **New Feature**: If it's a new file, write a full guide.
- **Bug Fix**: Only surgically update the logic/description.
- **Context Usage**: Use the provided "SOURCE CODE CONTEXT" to find the exact Types/Interfaces for the response JSON. DO NOT hallucinate fields.
`;

  const userPrompt = `
### TASK
${isUpdate ? "SURGICALLY UPDATE the existing MDX to match the new code." : "CREATE NEW MDX documentation for this code."}

### 1. THE CODE DIFF (What changed?)
${JSON.stringify(diffSummary, null, 2)}

### 2. SOURCE CODE CONTEXT (Types & Logic)
${contextBlocks.length > 0 ? contextBlocks.join("\n\n") : "No context available."}

### 3. EXISTING DOCUMENTATION
${isUpdate ? existingDocContent : "(New File)"}

### EXECUTION STEPS
1. **Analyze the Change**: Did an endpoint name change? Did a new parameter get added? Is a field now required?
2. **Draft Content**: 
   - If a parameter \`status\` was added, insert a \`<ParamField>\` row.
   - If the return type changed, update the JSON response block.
3. **Refine**: Ensure all components (<ParamField>, <Warning>) are syntactically correct.

### OUTPUT
Return **ONLY** the raw MDX content. No markdown wrappers around the whole response.
`;

  const response = await client.chat.completions.create({
    model: "gpt-4o", // 4o is critical for following complex style guides
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ],
    temperature: 0.1, // Low temp for high adherence to the style guide
  });

  let content = response.choices?.[0]?.message?.content || "";

  // 3. Final Sanitization
  return content
    .replace(/^```[a-z]*\n/i, "") // Remove starting code fence
    .replace(/\n```$/i, "")        // Remove ending code fence
    .trim();
}