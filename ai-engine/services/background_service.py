import os
import asyncio
from langchain_experimental.graph_transformers import LLMGraphTransformer

from core.chroma import collection
from core.neo4j import graph
from core.llm import llm_graph
from core.config import settings
from services.podcast_service import generate_script, synthesize_audio

ALLOWED_NODES = ["Concept", "Process", "Technology", "Person", "Framework", "Metric", "Definition"]
ALLOWED_RELATIONSHIPS = ["RELATES_TO", "USES", "PART_OF", "DEPENDS_ON", "IMPROVES", "CONTRASTS_WITH", "DEFINES"]

active_podcast_tasks: set[str] = set()


async def extract_graph(doc_id: str, user_id: str, chunks: list) -> None:
    if not graph:
        print("DEBUG [BG]: Neo4j not connected — skipping graph extraction.")
        return

    # HARD LIMIT: Groq free tier has 100,000 Tokens Per Day limit.
    # A 71 chunk document consumes ~71,000 to 100,000 tokens instantly.
    # Truncate to the first 20 chunks (~20,000 tokens) to ensure the API doesn't lock out.
    MAX_GRAPH_CHUNKS = 20
    if len(chunks) > MAX_GRAPH_CHUNKS:
        print(f"DEBUG [BG]: Truncating graph extraction from {len(chunks)} to {MAX_GRAPH_CHUNKS} chunks to prevent TPD limit.")
        chunks = chunks[:MAX_GRAPH_CHUNKS]

    print(f"DEBUG [BG]: Starting graph extraction for {doc_id} ({len(chunks)} chunks)…")

    transformer = LLMGraphTransformer(
        llm=llm_graph,
        allowed_nodes=ALLOWED_NODES,
        allowed_relationships=ALLOWED_RELATIONSHIPS,
        strict_mode=False,
    )

    stored = 0
    failed = 0

    for i, chunk in enumerate(chunks):
        try:
            graph_docs = transformer.convert_to_graph_documents([chunk])

            for gd in graph_docs:
                # Stamp every node with doc_id + userId
                node_ids = {node.id for node in gd.nodes}
                for node in gd.nodes:
                    node.properties["doc_id"] = doc_id
                    node.properties["userId"] = user_id

                # Sanitize relationships: drop any that reference an undeclared node ID.
                # This prevents Groq's tool_use_failed error where the LLM creates a
                # relationship to a node it never declared in the nodes array.
                valid_rels = []
                for rel in gd.relationships:
                    src_id = rel.source.id
                    tgt_id = rel.target.id
                    if src_id not in node_ids or tgt_id not in node_ids:
                        print(
                            f"DEBUG [BG]: Dropping orphan rel [{src_id}]→[{tgt_id}] "
                            f"(chunk {i+1}) — node not declared."
                        )
                        continue
                    rel.properties["doc_id"] = doc_id
                    rel.properties["userId"] = user_id
                    valid_rels.append(rel)
                gd.relationships = valid_rels

            if graph_docs:
                graph.add_graph_documents(graph_docs)
                stored += 1

        except Exception as e:
            failed += 1
            print(f"WARN [BG]: Chunk {i+1}/{len(chunks)} failed for {doc_id}: {e}")
            continue  # Don't abort — keep processing remaining chunks

    print(
        f"DEBUG [BG]: Graph extraction complete for {doc_id} — "
        f"{stored} chunks stored, {failed} chunks failed."
    )


async def generate_podcast_background(doc_id: str) -> None:
    try:
        filename = f"podcast_{doc_id}.mp3"
        file_path = os.path.join(settings.AUDIO_DIR, filename)
        timeline_path = os.path.join(settings.AUDIO_DIR, f"podcast_{doc_id}.json")

        if os.path.exists(file_path) and os.path.exists(timeline_path):
            print(f"DEBUG [BG]: Podcast already cached for {doc_id}, skipping.")
            return

        print(f"DEBUG [BG]: Starting podcast generation for {doc_id}…")

        results = collection.get(where={"doc_id": doc_id})
        documents = results.get("documents", [])
        if not documents:
            print(f"DEBUG [BG]: No text found for {doc_id} — skipping podcast.")
            return
        full_text = "\n".join(documents)
        # Cap the text length to prevent 413 Payload Too Large / TPM token limit errors
        MAX_PODCAST_CHARS = 12000
        if len(full_text) > MAX_PODCAST_CHARS:
            print(f"DEBUG [BG]: Truncating podcast input from {len(full_text)} to {MAX_PODCAST_CHARS} chars to save tokens.")
            full_text = full_text[:MAX_PODCAST_CHARS]

        node_ids: list[str] = []
        if graph:
            try:
                data = graph.query(
                    "MATCH (n {doc_id: $doc_id}) RETURN n.id AS id",
                    params={"doc_id": doc_id},
                )
                node_ids = [r["id"] for r in data if r.get("id")]
            except Exception as e:
                print(f"DEBUG [BG]: Could not fetch node IDs: {e}")

        script = generate_script(full_text)
        await synthesize_audio(script, filename, node_ids)
        print(f"DEBUG [BG]: Podcast ready — {filename}")
    except Exception as e:
        print(f"ERROR [BG]: Podcast generation failed for {doc_id}: {e}")


async def process_graph_and_podcast(
    doc_id: str,
    user_id: str,
    chunks: list,
) -> None:
    """
    Background pipeline triggered after a document is ingested:
      Phase 1 & 2 run in parallel:
      - Knowledge graph extraction via Groq → Neo4j
      - Podcast script generation + TTS synthesis → static/audio/
    """
    if doc_id in active_podcast_tasks:
        print(f"DEBUG [BG]: Task already active for {doc_id}, skipping.")
        return

    active_podcast_tasks.add(doc_id)
    try:
        # Run both tasks concurrently
        await asyncio.gather(
            extract_graph(doc_id, user_id, chunks),
            generate_podcast_background(doc_id)
        )
    except Exception as exc:
        print(f"ERROR [BG]: Background pipeline failed for {doc_id}: {exc}")
    finally:
        active_podcast_tasks.discard(doc_id)
        print(f"DEBUG [BG]: Task cleanup complete for {doc_id}")
