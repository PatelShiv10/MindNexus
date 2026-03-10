from fastapi import HTTPException
from core.chroma import collection
from core.neo4j import graph


async def get_graph_data(doc_id: str | None, user_id: str | None) -> dict:
    """Return nodes + links from Neo4j, filtered by user and optionally by doc."""
    if not graph:
        return {"nodes": [], "links": []}

    try:
        print(f"DEBUG [graph]: doc_id={doc_id}, user_id={user_id}")

        if doc_id:
            query = """
            MATCH (n {doc_id: $doc_id, userId: $user_id})-[r]->(m {doc_id: $doc_id, userId: $user_id})
            RETURN n.id AS source, type(r) AS type, m.id AS target
            LIMIT 500
            """
            params = {"doc_id": doc_id, "user_id": user_id}
        else:
            query = """
            MATCH (n {userId: $user_id})-[r]->(m {userId: $user_id})
            RETURN n.id AS source, type(r) AS type, m.id AS target
            LIMIT 500
            """
            params = {"user_id": user_id}

        data = graph.query(query, params=params)

        nodes: set[str] = set()
        links: list[dict] = []
        for record in data:
            nodes.add(record["source"])
            nodes.add(record["target"])
            links.append({
                "source": record["source"],
                "target": record["target"],
                "type": record["type"],
            })

        print(f"DEBUG [graph]: {len(nodes)} nodes, {len(links)} links")
        return {"nodes": [{"id": n, "group": 1} for n in nodes], "links": links}

    except Exception as exc:
        print(f"ERROR [graph]: {exc}")
        import traceback; traceback.print_exc()
        return {"nodes": [], "links": []}


async def delete_document_data(doc_id: str) -> dict:
    """Delete all data for a document: ChromaDB vectors, Neo4j nodes, podcast files."""
    try:
        collection.delete(where={"doc_id": doc_id})
        print(f"DEBUG [graph]: Deleted ChromaDB vectors for {doc_id}")

        if graph:
            graph.query("MATCH (n {doc_id: $doc_id}) DETACH DELETE n", {"doc_id": doc_id})
            print(f"DEBUG [graph]: Deleted Neo4j nodes for {doc_id}")

        import os
        for ext in ("mp3", "json"):
            path = f"static/audio/podcast_{doc_id}.{ext}"
            if os.path.exists(path):
                os.remove(path)
                print(f"DEBUG [graph]: Deleted {path}")

        return {"status": "success", "message": f"Document {doc_id} fully deleted"}

    except Exception as exc:
        print(f"ERROR [graph/delete]: {exc}")
        raise HTTPException(status_code=500, detail=str(exc))


async def purge_all_data() -> dict:
    """Wipe ALL vectors from ChromaDB and ALL nodes from Neo4j."""
    try:
        ids = collection.get()["ids"]
        if ids:
            collection.delete(ids=ids)
        print("DEBUG [purge]: ChromaDB wiped.")

        if graph:
            graph.query("MATCH (n) DETACH DELETE n")
            print("DEBUG [purge]: Neo4j graph wiped.")

        return {"status": "success", "message": "Neural memory wiped"}

    except Exception as exc:
        print(f"ERROR [purge]: {exc}")
        raise HTTPException(status_code=500, detail=str(exc))
