import { Pool } from "pg";
import { pipeline } from "@xenova/transformers";
import dotenv from 'dotenv';
import path from 'path';

/**
 * SENIOR CONFIGURATION BLOCK
 * We resolve the path relative to the Current Working Directory (CWD)
 * to ensure it works regardless of whether we are running .ts or compiled .js
 */
const envPath = path.join(process.cwd(), 'cocoindex', '.env');
dotenv.config({ path: envPath });

// Debugging logs are essential for infrastructure setup
if (!process.env.COCOINDEX_DATABASE_URL) {
    console.warn(`⚠️  Warning: COCOINDEX_DATABASE_URL not found at ${envPath}`);
    console.log("Current working directory:", process.cwd());
}

// Singleton Pool: Reuse connections for efficiency
const pool = new Pool({ 
    connectionString: process.env.COCOINDEX_DATABASE_URL,
    max: 10,
    idleTimeoutMillis: 30000,
});

let embedder: any = null;

/**
 * Lazy-load the transformer model to save memory until the function is called.
 */
async function getEmbedder() {
    if (!embedder) {
        // Model: all-MiniLM-L6-v2 produces 384-dimensional vectors
        embedder = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
    }
    return embedder;
}

/**
 * Retrieves relevant code blocks based on semantic similarity to a PR diff.
 */
export async function getRelevantContext(
    diffSummary: any
): Promise<string[]> {
    // 1. Prepare search string from diff (filenames + summary)
    const files = Object.keys(diffSummary?.files || {}).join(", ");
    const summary = diffSummary?.summary || "";
    const searchString = `Files: ${files}. Summary: ${summary}`;
    
    try {
        // 2. Generate Embedding
        const generateEmbedding = await getEmbedder();
        const output = await generateEmbedding(searchString, { pooling: "mean", normalize: true });
        
        // Convert to standard Array and then to string for pgvector
        const queryVector = JSON.stringify(Array.from(output.data));

        // 3. Query Postgres using Vector Similarity (Cosine Distance)
        // We order by distance (<=>) to leverage the HNSW index
        const query = `
            SELECT code, 1 - (embedding <=> $1) AS similarity
            FROM codeembedding__code_embeddings
            ORDER BY embedding <=> $1
            LIMIT 5;
        `;
        
        const res = await pool.query(query, [queryVector]);

        // 4. Quality Threshold Filter
        // Only return context if it's actually relevant (> 0.4 similarity)
        return res.rows
            .filter(row => row.similarity > 0.4) 
            .map(row => row.code);

    } catch (error) {
        // Senior engineers log the context of the error for faster debugging
        console.error("❌ Context Retrieval Failed:", error instanceof Error ? error.message : error);
        return []; // Return empty array so the main process doesn't crash
    }
}