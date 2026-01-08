import OpenAI from "openai";
import { getRelevantContext } from "./contextRetriver";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function generateDocUpdate(
  repoId: string,
  diffSummary: any,
  existingDocContent: string = ""
): Promise<string> {
  // --- 1. PRESERVED LOGGING (OBSERVABILITY) ---
  console.log("🤖 AI Documentation Generation Started");
  console.log("Repository ID:", repoId);

  console.log("Generating diff summary:");
  console.log(JSON.stringify(diffSummary, null, 2));

  const contextBlocks = await getRelevantContext(repoId, diffSummary);
  console.log("Retrieved source code context blocks (via RAG):");
  if (contextBlocks.length > 0) {
    contextBlocks.forEach((block, idx) => {
      console.log(`--- Context Block ${idx + 1} ---`);
      console.log(block);
    });
  } else {
    console.log("No context available.");
  }

  const isUpdate = existingDocContent.length > 0;
  console.log(isUpdate ? "Updating existing documentation." : "Creating new documentation.");

  // --- 2. SENIOR ENGINEER PROMPT LOGIC ---
  
  const systemPrompt = `
### ROLE
You are a Staff Technical Writer for a top-tier developer platform (like Stripe or Vercel). 
Your documentation is strictly evidence-based: you document ONLY what is present in the code diff and context.

### PROTOCOL: "ANALYZE FIRST, THEN FORMAT"
Do not blindly follow a template. First, determine the **Artifact Type** from the code, then apply the matching guidelines.

### ARCHETYPES (Choose the one that best fits the code)

**1. HTTP API / Route** (e.g., \`route.ts\`, \`controller.ts\`, uses \`req/res\`, \`NextResponse\`)
   - **Focus**: Endpoints, Methods, Auth, Request/Response shapes.
   - **Structure**: Title > Overview > Endpoint Definition > Params > Response Example.
   - **Requirement**: Use \`<ParamField>\` for query/body params.

**2. Code Library / Utility** (e.g., \`lib/\`, \`utils/\`, \`services/\`, \`hooks/\`)
   - **Focus**: Logic, Helper functions, Classes, Algorithms.
   - **Structure**: Title > Overview > Function Signatures > Usage Example.
   - **Rule**: If it's a single function, document that function. If it's a class, document key methods.

**3. UI Component** (e.g., \`components/\`, \`.tsx\`, \`.vue\`)
   - **Focus**: Visual elements, Props, Slots, Event Handlers.
   - **Structure**: Title > Overview > Props Table (\`<ParamField>\`) > Interactive Usage Example.

**4. Configuration / Environment** (e.g., \`.env\`, \`config.ts\`, \`docker-compose.yml\`)
   - **Focus**: Environment variables, Flags, Setup steps.
   - **Structure**: Title > Purpose > Configuration Options > Default Values.
   - **Rule**: Explain *why* a variable is needed (e.g., "Controls the rate limit").

**5. Data Model / Schema** (e.g., \`schema.prisma\`, \`types.ts\`, SQL migrations)
   - **Focus**: Database tables, Relationships, Type definitions.
   - **Structure**: Title > Model Description > Fields > Relationships.

### VISUAL STYLE GUIDE (STRICT ENFORCEMENT)
While you decide the *content*, you MUST output it using these visual components:

1.  **Top Badge**: Immediately under the H1 Title, add a badge showing the file path.
    Example: \`<div className="flex gap-2"><span className="px-2 py-1 bg-gray-100 rounded text-xs font-mono text-gray-600">lib/usage-limit.ts</span></div>\`
    
2.  **Configuration MUST be a Table**:
    - Do not use lists for Env Vars. Use a Markdown table with columns: | Variable | Description | Required |

3.  **Parameters MUST be a Table**:
    - For functions or classes, use a Markdown table: | Name | Type | Description |

4.  **Callouts**:
    - Use \`<Callout type="warning">\` for side effects or breaking changes.
    - Use \`<Callout type="info">\` for helpful context.

### UNIVERSAL RULES (Apply to ALL types)
1. **No Hallucinations**: If the code is a simple utility function, DO NOT invent a REST API endpoint for it.
2. **Context-Aware**: If you see imports like \`redis\`, mention that Redis is a dependency.
3. **Adaptive Formatting**: 
   - If a section is irrelevant (e.g., a function with no arguments), skip the "Parameters" section.
   - Code blocks must always specify the language (e.g., \`\`\`typescript).
`;

  // Calculate file string for the prompt context
  const touchedFiles = diffSummary.touchedFiles ? diffSummary.touchedFiles.join(", ") : "Unknown File";

  const userPrompt = `
### TASK
${isUpdate ? "SURGICALLY UPDATE the existing MDX to reflect the code changes." : "CREATE NEW MDX documentation based on the code analysis."}

### GROUND TRUTH
**Primary File(s):** \`${touchedFiles}\`
*(Use the file extension and directory to infer the Archetype defined in the System Prompt)*

### 1. CODE DIFF (The Change)
${JSON.stringify(diffSummary, null, 2)}

### 2. CONTEXT (Dependencies & Definitions)
${contextBlocks.length > 0 ? contextBlocks.join("\n\n") : "No extra context."}

### 3. EXISTING DOCS (To Update)
${isUpdate ? existingDocContent : "(New File)"}

### OUTPUT
Return **ONLY** the valid MDX content. Do not include introductory text like "Here is the documentation".
`;

  console.log("Sending request to OpenAI with system and user prompts...");

  // --- 3. EXECUTION ---

  const response = await client.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ],
    // 0.3 = Controlled Creativity (Smart enough to pick the right archetype, strict enough to follow rules)
    temperature: 0.3, 
  });

  let content = response.choices?.[0]?.message?.content || "";

  // --- 4. PRESERVED OUTPUT LOGGING ---
  console.log("AI-generated documentation received:");
  console.log(content);

  return content
    .replace(/^```[a-z]*\n/i, "") 
    .replace(/\n```$/i, "")     
    .trim();
}