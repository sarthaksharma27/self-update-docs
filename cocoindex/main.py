import os
import cocoindex
import sys
import time
import psycopg2
from psycopg2.extras import RealDictCursor

# --- CONFIGURATION ---
# Database URL is still provided via Job Environment Secrets
DATABASE_URL = os.getenv("COCOINDEX_DATABASE_URL")
# Defaulting path; the script will find the sub-folder dynamically
BASE_MOUNT_PATH = "/workspace"

def log(msg):
    print(msg)
    sys.stdout.flush()

# --- SENIOR PATTERN: Database Handshake ---
# This function finds the repo that the worker just marked as 'INDEXING'
def fetch_pending_repo():
    if not DATABASE_URL:
        log("❌ [FATAL] COCOINDEX_DATABASE_URL environment variable is missing.")
        return None
        
    try:
        # Senior Move: Connect timeout prevents the script from hanging forever if DB is down
        conn = psycopg2.connect(DATABASE_URL, connect_timeout=5)
        # RealDictCursor lets us access columns by name: repo['id']
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            # SENIOR FIX: Prisma uses PascalCase for table names ("Repository").
            # In Postgres, you MUST use double quotes for PascalCase table names.
            query = 'SELECT id, name, type FROM "Repository" WHERE "indexingStatus" = \'INDEXING\' LIMIT 1'
            cur.execute(query)
            return cur.fetchone()
    except Exception as e:
        log(f"❌ [DB] Connection failed: {e}")
        return None
    finally:
        if 'conn' in locals(): conn.close()

# --- MOUNT CHECK ---
def wait_for_storage(path, retries=5, delay=2):
    for i in range(retries):
        if os.path.exists(path):
            return True
        log(f"⚠️ [SYSTEM] Waiting for mount {path}... ({i+1}/{retries})")
        time.sleep(delay)
    return False

# -----------------------------------------------------------------------------
# EXECUTION LOGIC
# -----------------------------------------------------------------------------

# 1. Ensure the /workspace drive is actually plugged in
if not wait_for_storage(BASE_MOUNT_PATH):
    log(f"❌ [FATAL] Mount point {BASE_MOUNT_PATH} not found. Root: {os.listdir('/')}")
    sys.exit(1)

# 2. Fetch the work details from Postgres
repo = fetch_pending_repo()
if not repo:
    log("🏁 [FINISH] No repositories found with 'INDEXING' status. Exiting.")
    sys.exit(0)

REPO_ID = repo['id']
REPO_TYPE = repo.get('type', 'UNKNOWN')

# 3. Path Discovery
# Constructing the exact path used by the worker
REPO_PATH = None
for root, dirs, files in os.walk(BASE_MOUNT_PATH):
    if f"repo_{REPO_ID}" in root:
        REPO_PATH = root
        break

if not REPO_PATH:
    log(f"❌ [FATAL] Folder for repo_{REPO_ID} not found in {BASE_MOUNT_PATH}")
    log(f"DEBUG: Visible directories: {os.listdir(BASE_MOUNT_PATH)}")
    sys.exit(1)

log(f"🚀 [START] Indexing {REPO_TYPE} Repo: {repo['name']} ({REPO_ID})")
log(f"📂 [PATH] Scanning: {REPO_PATH}")

@cocoindex.op.function()
def extract_extension(filename: str) -> str:
    return os.path.splitext(filename)[1]

@cocoindex.flow_def(name="CodeEmbedding")
def code_embedding_flow(flow_builder: cocoindex.FlowBuilder, data_scope: cocoindex.DataScope):
    data_scope["files"] = flow_builder.add_source(
        cocoindex.sources.LocalFile(
            path=REPO_PATH, 
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
        primary_key_fields=["repo_id", "filename", "location"],
        vector_indexes=[
            cocoindex.VectorIndexDef(
                field_name="embedding",
                metric=cocoindex.VectorSimilarityMetric.COSINE_SIMILARITY
            )
        ],
    )