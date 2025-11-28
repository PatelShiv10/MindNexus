from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
import os
from dotenv import load_dotenv
import google.generativeai as genai
import chromadb
import json
import random

load_dotenv()

# Configure Gemini
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
model = genai.GenerativeModel('gemini-pro')

# Configure ChromaDB (Persistent)
chroma_client = chromadb.PersistentClient(path="./chroma_db")
collection = chroma_client.get_or_create_collection(name="mindnexus_docs")

app = FastAPI()

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

@app.get("/")
def read_root():
    return {"status": "MindNexus Cortex Online", "service": "Python"}

@app.get("/health")
def health_check():
    return {"status": "healthy"}

@app.post("/generate_quiz")
async def generate_quiz(request: QuizRequest):
    try:
        # 1. Fetch chunks from ChromaDB
        # We query by 'ids' if we stored them that way, or metadata. 
        # Assuming doc_ids map to metadata 'source_id' or similar.
        # For this implementation, let's assume we query by metadata 'doc_id'.
        
        results = collection.get(
            where={"doc_id": {"$in": request.doc_ids}},
            limit=10 # Limit context to avoid token limits
        )
        
        documents = results['documents']
        if not documents:
            # Fallback if no documents found (or mock mode)
            context = "General knowledge about Artificial Intelligence and Neural Networks."
        else:
            # Randomly select chunks if we have too many
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
        
        # Clean up response if it contains markdown code blocks
        if "```json" in text_response:
            text_response = text_response.replace("```json", "").replace("```", "")
        elif "```" in text_response:
            text_response = text_response.replace("```", "")
            
        quiz_data = json.loads(text_response.strip())
        
        return quiz_data

    except Exception as e:
        print(f"Error generating quiz: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
