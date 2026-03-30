import os
import asyncio
from pydantic import BaseModel, Field
from typing import List
from langchain_core.prompts import ChatPromptTemplate
from langchain_community.graphs.graph_document import GraphDocument, Node as LCNode, Relationship as LCRel

from core.chroma import collection
from core.neo4j import graph
from core.llm import llm_graph
from core.config import settings
from services.podcast_service import generate_script, synthesize_audio

ALLOWED_NODES = ["Concept", "Theory", "Principle", "Process", "Technology", "Framework", "Tool", "Person", "Organization", "Location", "Event", "Metric", "Problem", "Solution", "Example"]
ALLOWED_RELATIONSHIPS = ["RELATES_TO", "USES", "PART_OF", "DEPENDS_ON", "HAS_PREREQUISITE", "IMPROVES", "CONTRASTS_WITH", "CAUSES", "SOLVES", "AFFECTS", "PRODUCES", "IMPLEMENTS", "IS_EXAMPLE_OF", "DEFINES"]

CANONICAL_NODE_TYPE_MAP = {t.lower(): t for t in ALLOWED_NODES}
CANONICAL_REL_TYPE_MAP = {t.lower(): t for t in ALLOWED_RELATIONSHIPS}

class Node(BaseModel):
    id: str = Field(description="Name or ID of the node. Must be canonicalized (e.g. use 'Artificial Intelligence' instead of 'AI')")
    type: str = Field(description="Type of the node. Must be strictly from the ALLOWED_NODES list.")

class Edge(BaseModel):
    source: Node = Field(description="Source node")
    target: Node = Field(description="Target node")
    type: str = Field(description="Type of relationship. Must be strictly from the ALLOWED_RELATIONSHIPS list.")

class KnowledgeGraph(BaseModel):
    nodes: List[Node] = Field(description="List of extracted nodes")
    relationships: List[Edge] = Field(description="List of extracted relationships")

# Threshold: documents with this many chunks or more use the lite prompt
LARGE_DOC_CHUNK_THRESHOLD = 28

system_prompt_dense = f"""
You are an expert Knowledge Graph Extractor optimized for maximum density and accuracy.

STRICT SCHEMA:
- ALLOWED_NODES: {', '.join(ALLOWED_NODES)}
- ALLOWED_RELATIONSHIPS: {', '.join(ALLOWED_RELATIONSHIPS)}
If unsure, default to Concept and RELATES_TO. Never discard meaningful information.

CRITICAL RULES:
1. DENSITY TARGET: Extract 15-20 nodes and 20-30 relationships per text block. Every sentence should contribute at least one relationship. Build a richly interconnected graph — isolated nodes are a failure.

2. ENTITY RESOLUTION: Canonicalize all entities to their full, standard Title Case form. "AI", "A.I.", "ai" → "Artificial Intelligence". "ML" → "Machine Learning". "NLP" → "Natural Language Processing". Always use the most complete, unambiguous form so that entities naturally merge across different text blocks.

3. RELATIONSHIP SPECIFICITY: Prefer specific relationship types (USES, PART_OF, DEPENDS_ON, CAUSES, IMPLEMENTS) over generic RELATES_TO. Use RELATES_TO only as a last resort.

4. CONNECT EVERYTHING: Every extracted node must participate in at least one relationship. If a concept is mentioned alongside another, find and name their relationship.

5. Ignore filler words, generic pronouns, page numbers, and formatting artifacts. Focus on domain-specific concepts and their structural relationships.
"""

system_prompt_lite = f"""
You are an expert Knowledge Graph Extractor optimized for accuracy and conciseness.

STRICT SCHEMA:
- ALLOWED_NODES: {', '.join(ALLOWED_NODES)}
- ALLOWED_RELATIONSHIPS: {', '.join(ALLOWED_RELATIONSHIPS)}
If unsure, default to Concept and RELATES_TO.

CRITICAL RULES:
1. DENSITY TARGET: Extract 8-12 nodes and 10-15 relationships per text block. Focus on the MOST important concepts and their key relationships. Prioritize quality over quantity.

2. ENTITY RESOLUTION: Canonicalize all entities to their full, standard Title Case form. "AI", "A.I.", "ai" → "Artificial Intelligence". "ML" → "Machine Learning". Always use the most complete, unambiguous form so that entities naturally merge across different text blocks.

3. RELATIONSHIP SPECIFICITY: Prefer specific relationship types (USES, PART_OF, DEPENDS_ON, CAUSES, IMPLEMENTS) over generic RELATES_TO.

4. CONNECT EVERYTHING: Every extracted node must participate in at least one relationship.

5. Ignore filler words, generic pronouns, page numbers, and formatting artifacts. Focus only on the most significant domain-specific concepts.
"""

active_podcast_tasks: set[str] = set()

_using_fallback_key = False


def _normalize_node_type(node_type: str | None) -> str:
    if not node_type:
        return "Concept"
    return CANONICAL_NODE_TYPE_MAP.get(node_type.strip().lower(), "Concept")


def _normalize_rel_type(rel_type: str | None) -> str:
    if not rel_type:
        return "RELATES_TO"
    return CANONICAL_REL_TYPE_MAP.get(rel_type.strip().lower(), "RELATES_TO")


def _clean_node_id(node_id: str | None) -> str:
    """Normalize to collapsed-whitespace Title Case for consistent Neo4j MERGE."""
    if not node_id:
        return ""
    return " ".join(node_id.split()).strip().title()


def _build_graph_doc(
    doc_id: str,
    user_id: str,
    source_chunk,
    nodes: list[LCNode],
    relationships: list[LCRel],
) -> GraphDocument:
    gd = GraphDocument(nodes=nodes, relationships=relationships, source=source_chunk)
    node_ids = {node.id for node in gd.nodes}
    for node in gd.nodes:
        node.properties["doc_id"] = doc_id
        node.properties["userId"] = user_id

    valid_rels: list[LCRel] = []
    for rel in gd.relationships:
        if rel.source.id not in node_ids or rel.target.id not in node_ids:
            continue
        rel.properties["doc_id"] = doc_id
        rel.properties["userId"] = user_id
        valid_rels.append(rel)
    gd.relationships = valid_rels
    return gd


async def extract_graph(doc_id: str, user_id: str, chunks: list) -> None:
    if not graph:
        print("DEBUG [BG]: Neo4j not connected — skipping graph extraction.")
        return

    print(f"DEBUG [BG]: Starting full graph extraction for {doc_id} ({len(chunks)} chunks)…")

    is_pdf = False
    is_ppt = False
    is_word = False
    if chunks:
        source = chunks[0].metadata.get("source", "").lower()
        if source.endswith(".pdf"):
            is_pdf = True
        elif source.endswith((".ppt", ".pptx")):
            is_ppt = True
        elif source.endswith((".doc", ".docx")):
            is_word = True

    # Choose dense vs lite prompt based on chunk count
    is_large_doc = len(chunks) >= LARGE_DOC_CHUNK_THRESHOLD
    base_prompt = system_prompt_lite if is_large_doc else system_prompt_dense
    if is_large_doc:
        print(f"DEBUG [BG]: Large document ({len(chunks)} chunks ≥ {LARGE_DOC_CHUNK_THRESHOLD}) — using lite extraction (8-12 nodes/chunk).")

    dynamic_system_prompt = base_prompt
    if is_pdf:
        dynamic_system_prompt += "\n\n4. PDF EXTRACTION MODE: This is dense academic text. You must read line-by-line and extract every underlying Concept, Theory, and Relationship. Do not summarize; extract thoroughly."
    elif is_ppt:
        dynamic_system_prompt += "\n\n4. PPT EXTRACTION MODE: This is a presentation containing bullet points and image descriptions. Carefully integrate the image descriptions with the slide text to form meaningful educational concepts and relationships."
    elif is_word:
        dynamic_system_prompt += "\n\n4. WORD EXTRACTION MODE: This is a Word document with narrative text, headings, tables, and possible image descriptions. Extract from all sections and preserve continuity across adjacent chunks."

    extraction_prompt = ChatPromptTemplate.from_messages([
        ("system", dynamic_system_prompt),
        ("human", "Extract the graph from the following text:\n\n{text}")
    ])
    
    extractor = extraction_prompt | llm_graph.with_structured_output(KnowledgeGraph)

    stored = 0
    failed = 0
    all_graph_docs: list[GraphDocument] = []

    print(f"DEBUG [BG]: Single-pass dense extraction for {doc_id} ({len(chunks)} chunks)…")

    chunk_idx = 0
    while chunk_idx < len(chunks):
        chunk = chunks[chunk_idx]
        try:
            kg: KnowledgeGraph = await extractor.ainvoke({"text": chunk.page_content})

            # Build node map — Title Case IDs ensure natural MERGE hubs in Neo4j.
            node_map: dict[str, LCNode] = {}
            for n in kg.nodes:
                clean_id = _clean_node_id(n.id)
                if not clean_id:
                    continue
                if clean_id not in node_map:
                    node_map[clean_id] = LCNode(id=clean_id, type=_normalize_node_type(n.type))

            # Build relationships — only LLM-extracted edges, no synthetic ones.
            rels: list[LCRel] = []
            for r in kg.relationships:
                src_id = _clean_node_id(r.source.id)
                tgt_id = _clean_node_id(r.target.id)
                if not src_id or not tgt_id or src_id == tgt_id:
                    continue
                if src_id not in node_map:
                    node_map[src_id] = LCNode(id=src_id, type=_normalize_node_type(r.source.type))
                if tgt_id not in node_map:
                    node_map[tgt_id] = LCNode(id=tgt_id, type=_normalize_node_type(r.target.type))
                rels.append(
                    LCRel(
                        source=node_map[src_id],
                        target=node_map[tgt_id],
                        type=_normalize_rel_type(r.type),
                    )
                )

            if not node_map:
                print(f"WARN [BG]: Chunk {chunk_idx+1} produced no nodes, skipping.")
                chunk_idx += 1
                continue

            graph_doc = _build_graph_doc(
                doc_id=doc_id,
                user_id=user_id,
                source_chunk=chunk,
                nodes=list(node_map.values()),
                relationships=rels,
            )
            all_graph_docs.append(graph_doc)
            stored += 1
            print(f"DEBUG [BG]: Chunk {chunk_idx+1}/{len(chunks)} → {len(node_map)} nodes, {len(rels)} rels")

        except Exception as e:
            if "rate limit" in str(e).lower() or "429" in str(e):
                global _using_fallback_key
                if settings.GROQ_API_KEY_1 and not _using_fallback_key:
                    print("WARN [BG]: Rate limit hit on primary key! Switching to GROQ_API_KEY_1...")
                    _using_fallback_key = True
                    from langchain_groq import ChatGroq
                    fallback_llm = ChatGroq(
                        api_key=settings.GROQ_API_KEY_1,
                        model="llama-3.3-70b-versatile",
                        temperature=0,
                    )
                    extractor = extraction_prompt | fallback_llm.with_structured_output(KnowledgeGraph)
                    continue
                else:
                    print(f"WARN [BG]: Rate limit hit on chunk {chunk_idx+1}. Sleeping 10s...")
                    await asyncio.sleep(10)
            else:
                print(f"WARN [BG]: Chunk {chunk_idx+1}/{len(chunks)} failed for {doc_id}: {e}")

            failed += 1
            chunk_idx += 1
            continue

        if (chunk_idx + 1) % 5 == 0 and chunk_idx + 1 < len(chunks):
            print(f"DEBUG [BG]: Processed {chunk_idx+1}/{len(chunks)} chunks. Pausing for rate limit…")
            await asyncio.sleep(6)

        chunk_idx += 1

    # Commit all graph documents — Neo4j MERGE ensures entities with the same
    # Title Case ID become natural hub nodes that connect different regions.
    if all_graph_docs:
        graph.add_graph_documents(all_graph_docs)

    print(
        f"DEBUG [BG]: Graph extraction complete for {doc_id} — "
        f"{stored} chunks stored, {failed} failed."
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
        MAX_PODCAST_CHARS = 12000
        OVERLAP = 1000
        script = []
        
        start_idx = 0
        while start_idx < len(full_text):
            end_idx = min(start_idx + MAX_PODCAST_CHARS, len(full_text))
            batch_text = full_text[start_idx:end_idx]
            
            print(f"DEBUG [BG]: Generating podcast batch [{start_idx}:{end_idx}] of {len(full_text)} chars...")
            
            try:
                batch_script = generate_script(batch_text)
                if batch_script:
                    script.extend(batch_script)
            except Exception as e:
                if "rate limit" in str(e).lower() or "429" in str(e):
                    global _using_fallback_key
                    if settings.GROQ_API_KEY_1 and not _using_fallback_key:
                        print("WARN [BG]: Rate limit reached in Podcast! Switching to GROQ_API_KEY_1...")
                        _using_fallback_key = True
                        from langchain_groq import ChatGroq
                        import services.podcast_service
                        services.podcast_service.llm_podcast = ChatGroq(
                            api_key=settings.GROQ_API_KEY_1,
                            model=settings.LLM_MODEL,
                            temperature=0.85,
                        )
                        continue
                print(f"ERROR [BG]: Failed podcast generation for batch {start_idx}: {e}")
                
            if end_idx >= len(full_text):
                break
                
            start_idx += (MAX_PODCAST_CHARS - OVERLAP)
            print("DEBUG [BG]: Sleeping 8 seconds before next podcast batch...")
            await asyncio.sleep(8)

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
        await extract_graph(doc_id, user_id, chunks)
        await generate_podcast_background(doc_id)
    except Exception as exc:
        print(f"ERROR [BG]: Background pipeline failed for {doc_id}: {exc}")
    finally:
        active_podcast_tasks.discard(doc_id)
        print(f"DEBUG [BG]: Task cleanup complete for {doc_id}")
