import { Pool } from "pg";
import { pipeline } from "@xenova/transformers";
import dotenv from 'dotenv';
import path from 'path';

const envPath = path.join(process.cwd(), 'cocoindex', '.env');
dotenv.config({ path: envPath });

if (!process.env.COCOINDEX_DATABASE_URL) {
    console.warn(`Warning: COCOINDEX_DATABASE_URL not found at ${envPath}`);
    console.log("Current working directory:", process.cwd());
}

const pool = new Pool({ 
    connectionString: process.env.COCOINDEX_DATABASE_URL,
    max: 10,
    idleTimeoutMillis: 30000,
});

let embedder: any = null;

async function getEmbedder() {
    if (!embedder) {
        // Model: all-MiniLM-L6-v2 produces 384-dimensional vectors
        embedder = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
    }
    return embedder;
}

export async function getRelevantContext(
    diffSummary: any
): Promise<string[]> {
    const files = Object.keys(diffSummary?.files || {}).join(", ");
    const summary = diffSummary?.summary || "";
    const searchString = `Files: ${files}. Summary: ${summary}`;
    
    try {
        const generateEmbedding = await getEmbedder();
        const output = await generateEmbedding(searchString, { pooling: "mean", normalize: true });
        
        const queryVector = JSON.stringify(Array.from(output.data));

        const query = `
            SELECT code, 1 - (embedding <=> $1) AS similarity
            FROM codeembedding__code_embeddings
            ORDER BY embedding <=> $1
            LIMIT 5;
        `;
        
        const res = await pool.query(query, [queryVector]);

        return res.rows
            .filter(row => row.similarity > 0.4) 
            .map(row => row.code);

    } catch (error) {
        console.error("Context Retrieval Failed:", error instanceof Error ? error.message : error);
        return [];
    }
}