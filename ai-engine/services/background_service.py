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

system_prompt = f"""
You are a highly precise Knowledge Graph Extractor. 
Your goal is to extract the core educational concepts, entities, and functional relationships from the text.

CRITICAL RULES:
1. STRICT SCHEMA ENFORCEMENT: You must ONLY use the following categories.
ALLOWED_NODES: {', '.join(ALLOWED_NODES)}
ALLOWED_RELATIONSHIPS: {', '.join(ALLOWED_RELATIONSHIPS)}
Discard any entity or relationship that does not perfectly fit these categories.

2. ENTITY RESOLUTION & DISAMBIGUATION: You must merge similar entities, synonyms, abbreviations, and acronyms into a single canonical entity representation. 
For example, "AI", "A.I.", and "Artificial Intelligence" must all be extracted identically as a single node labeled "Artificial Intelligence" to prevent graph fragmentation.

3. Ignore filler words, generic pronouns, and disconnected trivia. Focus on core structural concepts.
"""

active_podcast_tasks: set[str] = set()

_using_fallback_key = False


async def extract_graph(doc_id: str, user_id: str, chunks: list) -> None:
    if not graph:
        print("DEBUG [BG]: Neo4j not connected — skipping graph extraction.")
        return

    print(f"DEBUG [BG]: Starting full graph extraction for {doc_id} ({len(chunks)} chunks)…")

    is_pdf = False
    if chunks and chunks[0].metadata.get("source", "").lower().endswith(".pdf"):
        is_pdf = True

    dynamic_system_prompt = system_prompt
    if is_pdf:
        dynamic_system_prompt += "\n\n4. PDF EXTRACTION MODE: This is dense academic text. You must read line-by-line and aggressively extract every underlying Concept, Theory, and Relationship. Do not summarize; extract exhaustively to build a highly dense graph."

    extraction_prompt = ChatPromptTemplate.from_messages([
        ("system", dynamic_system_prompt),
        ("human", "Extract the graph from the following text:\n\n{text}")
    ])
    
    extractor = extraction_prompt | llm_graph.with_structured_output(KnowledgeGraph)

    stored = 0
    failed = 0

    from langchain_core.documents import Document
    merged_chunks = []
    
    current_text = ""
    for idx, c in enumerate(chunks):
        current_text += c.page_content + "\n\n"
        if (idx + 1) % 3 == 0 or idx == len(chunks) - 1:
            merged_chunks.append(Document(page_content=current_text.strip(), metadata=c.metadata))
            current_text = ""
            
    print(f"DEBUG [BG]: Compressed {len(chunks)} fragments into {len(merged_chunks)} context blocks for graph extraction.")

    chunk_idx = 0
    while chunk_idx < len(merged_chunks):
        chunk = merged_chunks[chunk_idx]
        try:
            kg: KnowledgeGraph = await extractor.ainvoke({"text": chunk.page_content})
            
            lc_nodes = [LCNode(id=n.id, type=n.type) for n in kg.nodes]
            lc_rels = [LCRel(source=LCNode(id=r.source.id, type=r.source.type), 
                             target=LCNode(id=r.target.id, type=r.target.type), 
                             type=r.type) for r in kg.relationships]
            
            graph_doc = GraphDocument(nodes=lc_nodes, relationships=lc_rels, source=chunk)
            graph_docs = [graph_doc] if (lc_nodes or lc_rels) else []

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
                    print(f"WARN [BG]: Rate limit hit in graph batching on block {chunk_idx+1}. Sleeping 10s...")
                    await asyncio.sleep(10)
            else:
                print(f"WARN [BG]: Block {chunk_idx+1}/{len(merged_chunks)} failed for {doc_id}: {e}")
                
            failed += 1
            chunk_idx += 1
            continue    

        for gd in graph_docs:
            node_ids = {node.id for node in gd.nodes}
            for node in gd.nodes:
                node.properties["doc_id"] = doc_id
                node.properties["userId"] = user_id

            valid_rels = []
            for rel in gd.relationships:
                src_id = rel.source.id
                tgt_id = rel.target.id
                if src_id not in node_ids or tgt_id not in node_ids:
                    print(
                        f"DEBUG [BG]: Dropping orphan rel [{src_id}]→[{tgt_id}] "
                        f"(chunk {chunk_idx+1}) — node not declared."
                    )
                    continue
                rel.properties["doc_id"] = doc_id
                rel.properties["userId"] = user_id
                valid_rels.append(rel)
            gd.relationships = valid_rels

        if graph_docs:
            graph.add_graph_documents(graph_docs)
            stored += 1

        if (chunk_idx + 1) % 5 == 0 and chunk_idx + 1 < len(merged_chunks):
            print(f"DEBUG [BG]: Processed {chunk_idx+1}/{len(merged_chunks)} graph chunks. Pausing to clear Token bucket...")
            await asyncio.sleep(6)
            
        chunk_idx += 1

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
