import os
import chromadb
from core.config import settings

chroma_client = chromadb.PersistentClient(path=settings.CHROMA_PATH)

_migration_flag = os.path.join(settings.CHROMA_PATH, ".ollama_migrated")

if not os.path.exists(_migration_flag):
    try:
        chroma_client.delete_collection(name="mindnexus_docs")
        print("INFO: Old 384-dim ChromaDB collection deleted (one-time migration).")
    except Exception:
        pass
    os.makedirs(settings.CHROMA_PATH, exist_ok=True)
    open(_migration_flag, "w").close()
    print("INFO: ChromaDB ready — migrated to 768-dim.")

collection = chroma_client.get_or_create_collection(name="mindnexus_docs")
