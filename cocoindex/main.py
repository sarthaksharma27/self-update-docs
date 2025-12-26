import os
import cocoindex

# We will pass this via Environment Variables in the Docker run command
REPO_ID = os.getenv("REPO_ID")
REPO_PATH = "/workspace" # Inside docker, the host folder is mounted here

@cocoindex.op.function()
def extract_extension(filename: str) -> str:
    return os.path.splitext(filename)[1]

@cocoindex.flow_def(name="CodeEmbedding")
def code_embedding_flow(flow_builder: cocoindex.FlowBuilder, data_scope: cocoindex.DataScope):
    data_scope["files"] = flow_builder.add_source(
        cocoindex.sources.LocalFile(
            path=REPO_PATH, # Now dynamic
            included_patterns=["*.ts", "*.js", "*.tsx", "*.jsx", "*.py", "*.md", "*.json"],
            excluded_patterns=["**/node_modules", "**/dist", "**/.git", "**/build"],
        )
    )

    code_embeddings = data_scope.add_collector()

    with data_scope["files"].row() as file:
        file["extension"] = file["filename"].transform(extract_extension)
        file["chunks"] = file["content"].transform(
            cocoindex.functions.SplitRecursively(),
            language=file["extension"],
            chunk_size=1000,
            chunk_overlap=300,
        )

        with file["chunks"].row() as chunk:
            chunk["embedding"] = chunk["text"].transform(
                cocoindex.functions.SentenceTransformerEmbed(
                    model="sentence-transformers/all-MiniLM-L6-v2"
                )
            )

            # SENIOR MOVE: Add repo_id to EVERY record for strict isolation
            code_embeddings.collect(
                repo_id=REPO_ID, 
                filename=file["filename"],
                location=chunk["location"],
                code=chunk["text"],
                embedding=chunk["embedding"],
            )

    code_embeddings.export(
        "code_embeddings",
        cocoindex.targets.Postgres(),
        # Primary key now includes repo_id
        primary_key_fields=["repo_id", "filename", "location"],
        vector_indexes=[
            cocoindex.VectorIndexDef(
                field_name="embedding",
                metric=cocoindex.VectorSimilarityMetric.COSINE_SIMILARITY
            )
        ],
    )