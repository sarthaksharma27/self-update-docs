import { Pool } from "pg";
import { pipeline } from "@xenova/transformers";
import dotenv from 'dotenv';
import path from 'path';

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
        embedder = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
    }
    return embedder;
}

export async function getRelevantContext(
    repoId: string, 
    diffSummary: any
): Promise<string[]> {
    const summary = diffSummary?.summary || "Express route implementation";
    const searchString = `Implementation patterns for: ${summary}`;
    
    try {
        const generateEmbedding = await getEmbedder();
        const output = await generateEmbedding(searchString, { pooling: "mean", normalize: true });
        const queryVector = JSON.stringify(Array.from(output.data));

        const query = `
            SELECT code, 1 - (embedding <=> $1) AS similarity
            FROM codeembedding__code_embeddings
            WHERE repo_id = $2
            ORDER BY embedding <=> $1
            LIMIT 7;
        `;
        
        const res = await pool.query(query, [queryVector, repoId]);

        const context = res.rows
            .filter(row => row.similarity > 0.35) 
            .map(row => row.code);

        const topScore = res.rows[0]?.similarity || 0;
        console.log(`[RAG] Top Similarity: ${topScore.toFixed(3)} | Blocks: ${context.length} | Repo: ${repoId}`);
        console.log('THis is the context from codebase (RAG', context);
        return context;
    } catch (error) {
        console.error("[Context Retrieval Error]", error);
        return [];
    }
}