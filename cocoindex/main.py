import os
import cocoindex

@cocoindex.op.function()
def extract_extension(filename: str) -> str:
    """
    Extracts the file extension. 
    A senior engineer knows that keeping this logic isolated 
    allows for easy unit testing without running the whole flow.
    """
    return os.path.splitext(filename)[1]

@cocoindex.flow_def(name="CodeEmbedding")
def code_embedding_flow(flow_builder: cocoindex.FlowBuilder, data_scope: cocoindex.DataScope):
    # Source: Local files
    data_scope["files"] = flow_builder.add_source(
        cocoindex.sources.LocalFile(
            path=r"C:\Users\hp\X-project\self-update-docs\indexed_repos",
            included_patterns=[
                "*.ts", "*.js", "*.tsx", "*.jsx",
                "*.py", "*.md", "*.json"
            ],
            excluded_patterns=[
                "**/node_modules", "**/dist", "**/.git", "**/build"
            ],
        )
    )

    code_embeddings = data_scope.add_collector()

    # Process each file
    with data_scope["files"].row() as file:
        # Transform using the registered custom function
        file["extension"] = file["filename"].transform(extract_extension)

        # Chunk using Tree-sitter
        # NOTE: Arguments like language are passed directly to transform()
        file["chunks"] = file["content"].transform(
            cocoindex.functions.SplitRecursively(),
            language=file["extension"],
            chunk_size=1000,
            chunk_overlap=300,
        )

        # Embed each chunk
        with file["chunks"].row() as chunk:
            chunk["embedding"] = chunk["text"].transform(
                cocoindex.functions.SentenceTransformerEmbed(
                    model="sentence-transformers/all-MiniLM-L6-v2"
                )
            )

            code_embeddings.collect(
                filename=file["filename"],
                location=chunk["location"],
                code=chunk["text"],
                embedding=chunk["embedding"],
            )

    # Export to Postgres + pgvector
    # Use VectorIndexDef as per the updated specification
    code_embeddings.export(
        "code_embeddings",
        cocoindex.targets.Postgres(),
        primary_key_fields=["filename", "location"],
        vector_indexes=[
            cocoindex.VectorIndexDef(
                field_name="embedding",
                metric=cocoindex.VectorSimilarityMetric.COSINE_SIMILARITY
            )
        ],
    )