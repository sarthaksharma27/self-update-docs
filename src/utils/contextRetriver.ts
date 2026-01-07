import { Pool } from "pg";
import { pipeline, env } from "@xenova/transformers";
import dotenv from 'dotenv';
import path from 'path';

// --- 1. INFRASTRUCTURE FIX (Prevent Crashes) ---
// In production/Docker, we must use a writable directory for the AI model cache.
env.cacheDir = '/tmp/.transformers_cache';
env.allowLocalModels = false; 

const envPath = path.resolve(process.cwd(), 'cocoindex', '.env');
dotenv.config({ path: envPath });

let dbUrl = process.env.COCOINDEX_DATABASE_URL;
if (dbUrl?.includes('host.docker.internal')) {
    dbUrl = dbUrl.replace('host.docker.internal', 'localhost');
}

const pool = new Pool({ connectionString: dbUrl });

let embedder: any = null;

async function getEmbedder() {
    if (!embedder) {
        console.log("[RAG] 🧠 Initializing embedding model (cached in /tmp)...");
        embedder = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
    }
    return embedder;
}

export async function getRelevantContext(
    repoId: string, 
    diffSummary: any
): Promise<string[]> {
    const summary = diffSummary?.summary || "API endpoint implementation";
    
    // --- 2. SEARCH LOGIC UPGRADE ---
    // We specifically hunt for Types, Interfaces, and Schemas to build better Docs.
    const searchString = `TypeScript interfaces, Zod schemas, database models, and API logic for: ${summary}`;
    
    try {
        const generateEmbedding = await getEmbedder();
        const output = await generateEmbedding(searchString, { pooling: "mean", normalize: true });
        const queryVector = JSON.stringify(Array.from(output.data));

        // --- 3. SCHEMA FIX & NOISE FILTER ---
        // We use "filename" (from your Python script) and filter out non-code files.
        const query = `
            SELECT code, filename, 1 - (embedding <=> $1) AS similarity
            FROM codeembedding__code_embeddings
            WHERE repo_id = $2
            AND filename NOT LIKE '%.json' 
            AND filename NOT LIKE '%.lock'
            AND filename NOT LIKE '%.md'
            ORDER BY embedding <=> $1
            LIMIT 5;
        `;
        
        const res = await pool.query(query, [queryVector, repoId]);

        // Filter for high relevance only
        const context = res.rows
            .filter(row => row.similarity > 0.42) 
            .map(row => `// --- FILE: ${row.filename} ---\n${row.code}`);

        const topScore = res.rows[0]?.similarity || 0;
        console.log(`[RAG] 🔍 Top Similarity: ${topScore.toFixed(3)} | Blocks Found: ${context.length}`);
        
        return context;
    } catch (error) {
        console.error("[Context Retrieval Error]", error);
        return [];
    }
}