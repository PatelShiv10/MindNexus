from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
import os
from dotenv import load_dotenv
import google.generativeai as genai
import chromadb
import json
import random
import shutil
import uuid
import edge_tts
import io
from mutagen.mp3 import MP3
from fastapi.staticfiles import StaticFiles
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_chroma import Chroma
from langchain_core.prompts import PromptTemplate
from langchain_core.runnables import RunnablePassthrough
from langchain_core.output_parsers import StrOutputParser
from langchain_neo4j import Neo4jGraph
from langchain_experimental.graph_transformers import LLMGraphTransformer

load_dotenv()

# Configure Gemini
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
model = genai.GenerativeModel('gemini-2.5-pro')

# Configure ChromaDB (Persistent)
chroma_client = chromadb.PersistentClient(path="./chroma_db")
collection = chroma_client.get_or_create_collection(name="mindnexus_docs")

# Configure Neo4j
try:
    graph = Neo4jGraph(
        url="bolt://localhost:7687",
        username="neo4j",
        password="password"
    )
except Exception as e:
    print(f"Warning: Neo4j connection failed: {e}")
    graph = None

# Initialize Embeddings
embedding_function = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")

# Initialize LLM
llm = ChatGoogleGenerativeAI(model="gemini-2.5-pro", temperature=0.3)

app = FastAPI()

os.makedirs("static/audio", exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class QuizRequest(BaseModel):
    doc_ids: list[str]
    difficulty: str
    types: list[str]

class ChatRequest(BaseModel):
    query: str
    doc_ids: list[str] = []

class PodcastRequest(BaseModel):
    doc_id: str

@app.get("/")
def read_root():
    return {"status": "MindNexus Cortex Online", "service": "Python"}

@app.get("/health")
def health_check():
    return {"status": "healthy"}

@app.get("/debug/count")
def count_vectors():
    count = collection.count()
    return {"total_chunks": count}

@app.post("/ingest")
async def ingest_document(file: UploadFile = File(...), doc_id: str = Form(...)):
    temp_file_path = f"temp_uploads/{file.filename}"
    os.makedirs("temp_uploads", exist_ok=True)
    
    try:
        # Step A: Save uploaded file temporarily
        with open(temp_file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        # Step B: Load PDF
        loader = PyPDFLoader(temp_file_path)
        documents = loader.load()

        # DEBUG: Check content length
        print(f"DEBUG: Extracted {len(documents)} pages. Total characters: {sum(len(d.page_content) for d in documents)}")
        if sum(len(d.page_content) for d in documents) == 0:
            raise HTTPException(status_code=400, detail="PDF appears to be empty or scanned images.")
        
        # Step C: Split text
        text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
        chunks = text_splitter.split_documents(documents)
        
        # Step D: Add metadata
        for chunk in chunks:
            chunk.metadata["doc_id"] = doc_id
            chunk.metadata["source"] = file.filename
            
        # Step E: Embed and Store
        Chroma.from_documents(
            documents=chunks,
            embedding=embedding_function,
            persist_directory="./chroma_db",
            collection_name="mindnexus_docs"
        )

        # Step F: Graph Extraction (Neo4j)
        if graph:
            try:
                print("DEBUG: Starting Graph Extraction...")
                llm_transformer = LLMGraphTransformer(llm=llm)
                graph_documents = llm_transformer.convert_to_graph_documents(chunks)
                
                # Manually inject doc_id into every node
                for graph_doc in graph_documents:
                    for node in graph_doc.nodes:
                        node.properties["doc_id"] = doc_id
                        
                graph.add_graph_documents(graph_documents)
                print(f"DEBUG: Extracted {len(graph_documents)} graph documents")
            except Exception as e:
                print(f"Error in Graph Extraction: {e}")
        else:
            print("Skipping Graph Extraction (Neo4j not connected)")
        
        # Step F: Clean up
        os.remove(temp_file_path)
        
        return {"status": "success", "chunks": len(chunks)}
        
    except Exception as e:
        print(f"Error ingesting document: {e}")
        if os.path.exists(temp_file_path):
            os.remove(temp_file_path)
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/graph")
async def get_graph(doc_id: str = None):
    if not graph:
        return {"nodes": [], "links": []}
    
    try:
        # Fetch nodes and relationships
        if doc_id:
            query = f"MATCH (n {{doc_id: '{doc_id}'}})-[r]->(m {{doc_id: '{doc_id}'}}) RETURN n.id AS source, type(r) AS type, m.id AS target LIMIT 500"
        else:
            query = "MATCH (n)-[r]->(m) RETURN n.id AS source, type(r) AS type, m.id AS target LIMIT 500"
            
        data = graph.query(query)
        
        nodes = set()
        links = []
        
        for record in data:
            nodes.add(record['source'])
            nodes.add(record['target'])
            links.append({
                "source": record['source'],
                "target": record['target'],
                "type": record['type']
            })
            
        return {
            "nodes": [{"id": n, "group": 1} for n in list(nodes)],
            "links": links
        }
    except Exception as e:
        print(f"Error fetching graph: {e}")
        return {"nodes": [], "links": []}

@app.post("/generate_quiz")
async def generate_quiz(request: QuizRequest):
    try:
        # 1. Fetch chunks from ChromaDB
        results = collection.get(
            where={"doc_id": {"$in": request.doc_ids}},
            limit=10 
        )
        
        documents = results['documents']
        if not documents:
            context = "General knowledge about Artificial Intelligence and Neural Networks."
        else:
            if len(documents) > 5:
                documents = random.sample(documents, 5)
            context = "\n".join(documents)

        # 2. Construct Prompt
        prompt = f"""
        Based on the following context, generate a quiz.
        
        Context:
        {context}
        
        Requirements:
        - 3 Multiple Choice Questions (Single correct)
        - 2 Multiple Select Questions (Multiple correct)
        - 3 True/False
        - 1 Descriptive Question
        - Difficulty: {request.difficulty}
        
        Return ONLY raw JSON in this format (no markdown, no code blocks):
        [
            {{ "type": "MCQ", "question": "...", "options": ["A", "B", "C", "D"], "answer": "A" }},
            {{ "type": "MSQ", "question": "...", "options": ["A", "B", "C", "D"], "answer": ["A", "C"] }},
            {{ "type": "TrueFalse", "question": "...", "options": ["True", "False"], "answer": "True" }},
            {{ "type": "Descriptive", "question": "..." }}
        ]
        """

        # 3. Call Gemini
        response = model.generate_content(prompt)
        text_response = response.text
        
        if "```json" in text_response:
            text_response = text_response.replace("```json", "").replace("```", "")
        elif "```" in text_response:
            text_response = text_response.replace("```", "")
            
        quiz_data = json.loads(text_response.strip())
        
        return quiz_data

    except Exception as e:
        print(f"Error generating quiz: {e}")
        raise HTTPException(status_code=500, detail=str(e))

def format_docs(docs):
    return "\n\n".join(doc.page_content for doc in docs)

@app.post("/chat")
async def chat_with_cortex(request: ChatRequest):
    try:
        # 1. Define Retriever
        search_kwargs = {"k": 5}
        if request.doc_ids:
            search_kwargs["filter"] = {"doc_id": {"$in": request.doc_ids}}
            
        vectorstore = Chroma(
            client=chroma_client,
            collection_name="mindnexus_docs",
            embedding_function=embedding_function
        )
        
        retriever = vectorstore.as_retriever(search_kwargs=search_kwargs)
        
        # DEBUG: Log incoming request
        print(f"DEBUG: Received Query: {request.query}")
        print(f"DEBUG: Filter: {search_kwargs}")

        # 2. Retrieve Documents Manually (to get sources)
        docs = retriever.invoke(request.query)
        
        # DEBUG: Check what is being retrieved
        print(f"DEBUG: Retrieved {len(docs)} chunks from Vector DB")
        if len(docs) > 0:
            print(f"DEBUG: First Chunk Preview: {docs[0].page_content[:200]}")
        
        # 3. Define Chain (LCEL)
        template = """Answer the question based ONLY on the following context. If the answer is not in the context, say "I don't have enough information in my current knowledge base to answer that."
        
        Context:
        {context}
        
        Question: {question}
        
        Answer:"""
        
        prompt = PromptTemplate.from_template(template)
        
        rag_chain = (
            prompt
            | llm
            | StrOutputParser()
        )
        
        # 4. Run Chain
        formatted_context = format_docs(docs)
        answer = rag_chain.invoke({"context": formatted_context, "question": request.query})
        
        # 5. Extract Sources
        sources = list(set([doc.metadata.get("source", "Unknown") for doc in docs]))
        
        return {"answer": answer, "sources": sources}
        
    except Exception as e:
        print(f"Error in chat: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/document/{doc_id}")
async def delete_document(doc_id: str):
    try:
        # 1. Delete from ChromaDB
        collection.delete(where={"doc_id": doc_id})
        print(f"DEBUG: Deleted vectors for doc_id: {doc_id}")
        
        # 2. Delete from Neo4j
        if graph:
            query = "MATCH (n {doc_id: $doc_id}) DETACH DELETE n"
            graph.query(query, {"doc_id": doc_id})
            print(f"DEBUG: Deleted graph nodes for doc_id: {doc_id}")
            
        return {"status": "success", "message": f"Memory wiped for document {doc_id}"}
        
    except Exception as e:
        print(f"Error deleting document: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/purge")
async def purge_memory():
    try:
        # 1. Wipe ChromaDB
        ids = collection.get()["ids"]
        if ids:
            collection.delete(ids=ids)
        print("DEBUG: ChromaDB wiped.")
        
        # 2. Wipe Neo4j
        if graph:
            query = "MATCH (n) DETACH DELETE n"
            graph.query(query)
            print("DEBUG: Neo4j graph wiped.")
            
        return {"status": "success", "message": "Neural memory wiped"}
        
    except Exception as e:
        print(f"Error purging memory: {e}")
        raise HTTPException(status_code=500, detail=str(e))

def generate_script(text):
    # Increased limit to 10k chars and updated prompt for summary
    prompt = f"""
    Summarize the following document into a lively podcast script between a Host (enthusiastic) and a Guest (expert).
    Cover the entire document, not just the beginning.
    Return ONLY the dialogue in JSON format: 
    [
        {{"speaker": "Host", "text": "..."}}, 
        {{"speaker": "Guest", "text": "..."}}
    ]
    
    Text:
    {text[:10000]}
    """
    response = model.generate_content(prompt)
    text_response = response.text
    
    if "```json" in text_response:
        text_response = text_response.replace("```json", "").replace("```", "")
    elif "```" in text_response:
        text_response = text_response.replace("```", "")
        
    return json.loads(text_response.strip())

async def synthesize_audio(script, filename, node_ids):
    output_dir = "static/audio"
    os.makedirs(output_dir, exist_ok=True)
    
    file_path = os.path.join(output_dir, filename)
    timeline_path = os.path.join(output_dir, filename.replace('.mp3', '.json'))
    
    timeline = []
    current_offset = 0.0
    temp_files = []
    
    try:
        # Step 1: Generate all chunks sequentially
        for i, item in enumerate(script):
            # Input Validation: Skip empty text
            text = item.get("text", "").strip()
            if not text:
                continue
                
            voice = "en-US-BrianNeural" if item['speaker'] == "Host" else "en-US-EmmaNeural"
            # Unique temp filename for every chunk, saved in output_dir
            temp_file = os.path.join(output_dir, f"chunk_{uuid.uuid4()}.mp3")
            temp_files.append(temp_file)
            
            comm = edge_tts.Communicate(text, voice)
            
            # Write to temp file
            await comm.save(temp_file)
            
            # Node Matching (Line-based for robustness)
            # Check if any node_id appears in this line
            text_lower = text.lower()
            for node_id in node_ids:
                if node_id.lower() in text_lower:
                    # Add sync point at the START of this line
                    timeline.append({
                        "time": current_offset,
                        "nodeId": node_id
                    })
                    # Only match one node per line to avoid jumping too much? 
                    # Or match all? Let's match first found for stability.
                    break 
            
            # Calculate duration of this chunk to update offset
            try:
                # Use mutagen to get exact duration
                segment_duration = MP3(temp_file).info.length
                current_offset += segment_duration
            except Exception as e:
                print(f"Warning: Could not calculate duration for segment {i}: {e}")
                # Fallback: file size
                try:
                    size = os.path.getsize(temp_file)
                    current_offset += size / 16000 # Rough estimate
                except:
                    pass

        # Step 2: Stitch files
        # Open final file only when all chunks are ready
        with open(file_path, "wb") as final_file:
            for temp_file in temp_files:
                try:
                    with open(temp_file, "rb") as f:
                        final_file.write(f.read())
                except Exception as e:
                    print(f"Error reading temp file {temp_file}: {e}")

        # Step 3: Save timeline
        with open(timeline_path, "w") as f:
            json.dump(timeline, f)
            
    except Exception as e:
        print(f"Error in synthesis: {e}")
        # Cleanup final file if it exists and is partial
        if os.path.exists(file_path):
            try:
                os.remove(file_path)
            except:
                pass
        raise e
    finally:
        # Step 4: Cleanup temp files
        for temp_file in temp_files:
            if os.path.exists(temp_file):
                try:
                    os.remove(temp_file)
                except Exception as e:
                    print(f"Warning: Could not remove temp file {temp_file}: {e}")
            
    return filename, timeline

@app.post("/podcast")
async def generate_podcast(request: PodcastRequest):
    try:
        # 1. Deterministic Filenames
        filename = f"podcast_{request.doc_id}.mp3"
        timeline_filename = f"podcast_{request.doc_id}.json"
        
        file_path = f"static/audio/{filename}"
        timeline_path = f"static/audio/{timeline_filename}"
        
        # 2. Check Cache (Must have both audio and timeline)
        if os.path.exists(file_path) and os.path.exists(timeline_path):
            print(f"DEBUG: Podcast exists. Returning cached files.")
            with open(timeline_path, "r") as f:
                timeline = json.load(f)
            return {
                "audio_url": f"http://localhost:8000/static/audio/{filename}",
                "timeline": timeline
            }

        # 3. Fetch document text and graph nodes
        # Fetch Text - Get ALL chunks
        results = collection.get(where={"doc_id": request.doc_id})
        documents = results['documents']
        
        if not documents:
            raise HTTPException(status_code=404, detail="Document not found")
            
        full_text = "\n".join(documents)
        
        # Fetch Graph Nodes (for Sync)
        node_ids = []
        if graph:
            try:
                query = f"MATCH (n {{doc_id: '{request.doc_id}'}}) RETURN n.id AS id"
                data = graph.query(query)
                node_ids = [record['id'] for record in data]
                print(f"DEBUG: Found {len(node_ids)} nodes for sync matching.")
            except Exception as e:
                print(f"Warning: Could not fetch nodes for sync: {e}")
        
        # 4. Generate Script
        script = generate_script(full_text)
        
        # 5. Synthesize Audio with Timeline
        _, timeline = await synthesize_audio(script, filename, node_ids)
        
        # 6. Return URL and Timeline
        return {
            "audio_url": f"http://localhost:8000/static/audio/{filename}",
            "timeline": timeline
        }
        
    except Exception as e:
        print(f"Error generating podcast: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
