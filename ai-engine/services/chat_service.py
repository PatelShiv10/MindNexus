from fastapi import HTTPException
from langchain_chroma import Chroma
from langchain_core.prompts import PromptTemplate, ChatPromptTemplate, MessagesPlaceholder
from langchain_core.output_parsers import StrOutputParser
from langchain_core.documents import Document
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
from langchain.chains import create_history_aware_retriever, create_retrieval_chain
from langchain.chains.combine_documents import create_stuff_documents_chain

from core.chroma import chroma_client
from core.llm import llm, llm_vision, embedding_function


def format_docs(docs: list) -> str:
    return "\n\n".join(doc.page_content for doc in docs)


async def run_rag_chat(
    query: str,
    chat_history: list[dict],
    doc_ids: list[str],
    image: str | None = None,
) -> dict:
    """
    Two-stage RAG pipeline with an optional Vision branch:

    TEXT-ONLY path:
      Stage 1 — History-aware retrieval from ChromaDB (top-5 chunks).
      Stage 2 — Stuff-documents QA chain answered by the base LLM.

    VISION path (when image is provided):
      - Retrieve context from ChromaDB manually.
      - Invoke llm_vision (llama-3.2-90b-vision-preview) with a multimodal
        HumanMessage that combines the text query + base64 image_url.
    """
    try:
        langchain_history = []
        for msg in chat_history:
            if msg.get("role") == "human":
                langchain_history.append(HumanMessage(content=msg.get("content", "")))
            elif msg.get("role") == "ai":
                langchain_history.append(AIMessage(content=msg.get("content", "")))

        search_kwargs: dict = {"k": 5}
        if doc_ids:
            search_kwargs["filter"] = {"doc_id": {"$in": doc_ids}}

        vectorstore = Chroma(
            client=chroma_client,
            collection_name="mindnexus_docs",
            embedding_function=embedding_function,
        )

        if image:
            base64_data = image
            if not base64_data.startswith("data:"):
                base64_data = f"data:image/jpeg;base64,{base64_data}"

            retriever = vectorstore.as_retriever(search_kwargs=search_kwargs)
            docs = retriever.invoke(query)
            context_text = format_docs(docs) if docs else "No additional context available."

            vision_system = (
                "You are MindNexus, an advanced multimodal AI learning assistant. "
                "The user has shared an image alongside their question. "
                "Use BOTH the image and the retrieved text context below to give a "
                "clear, accurate, and comprehensive answer.\n\n"
                f"Retrieved context:\n{context_text}"
            )

            multimodal_content = [
                {"type": "text", "text": query},
                {"type": "image_url", "image_url": {"url": base64_data}},
            ]
            messages = [
                SystemMessage(content=vision_system),
                *langchain_history,
                HumanMessage(content=multimodal_content),
            ]

            response = await llm_vision.ainvoke(messages)
            answer = response.content

            citation = None
            if docs:
                top = docs[0]
                source = top.metadata.get("source", "Unknown")
                page = top.metadata.get("page")
                citation = f"{source} — Page {int(page) + 1}" if page is not None else source

            sources = list(set(doc.metadata.get("source", "Unknown") for doc in docs))
            return {"answer": answer, "sources": sources, "citation": citation}

        base_retriever = vectorstore.as_retriever(search_kwargs=search_kwargs)

        contextualize_q_system_prompt = (
            "Given a chat history and the latest user question "
            "which might reference context in the chat history, "
            "formulate a standalone question which can be understood "
            "without the chat history. Do NOT answer the question, "
            "just reformulate it if needed and otherwise return it as is."
        )
        contextualize_q_prompt = ChatPromptTemplate.from_messages(
            [
                ("system", contextualize_q_system_prompt),
                MessagesPlaceholder("chat_history"),
                ("human", "{input}"),
            ]
        )
        history_aware_retriever = create_history_aware_retriever(
            llm, base_retriever, contextualize_q_prompt
        )

        qa_system_prompt = (
            "You are MindNexus, an advanced AI learning assistant. You are currently operating in Direct Answer mode. "
            "You will be provided with retrieved context from a YouTube video transcript.\n\n"
            "STRICT RULES FOR TRANSCRIPTS:\n"
            "1. YouTube auto-captions lack punctuation and contain oral filler words. You must read the surrounding "
            "context carefully to infer the correct grammatical structure and speaker's true intent before answering.\n"
            "2. Be aware of common speech patterns (e.g., 'right no errors' generally means 'correct, with zero errors', "
            "not 'incorrect, there are errors').\n"
            "3. Answer the user's question directly, comprehensively, and accurately based ONLY on the provided context.\n"
            "4. Always cite the relevant timestamps (e.g., [01:40]) to show exactly where you pulled the information from.\n\n"
            "Context:\n{context}"
        )
        qa_prompt = ChatPromptTemplate.from_messages(
            [
                ("system", qa_system_prompt),
                MessagesPlaceholder("chat_history"),
                ("human", "{input}"),
            ]
        )

        question_answer_chain = create_stuff_documents_chain(llm, qa_prompt)
        rag_chain = create_retrieval_chain(history_aware_retriever, question_answer_chain)

        response = rag_chain.invoke({"input": query, "chat_history": langchain_history})
        answer = response["answer"]
        docs = response.get("context", [])

        citation = None
        if docs:
            top = docs[0]
            source = top.metadata.get("source", "Unknown")
            page = top.metadata.get("page")
            citation = f"{source} — Page {int(page) + 1}" if page is not None else source

        sources = list(set(doc.metadata.get("source", "Unknown") for doc in docs))
        return {"answer": answer, "sources": sources, "citation": citation}

    except Exception as exc:
        print(f"ERROR [chat]: {exc}")
        raise HTTPException(status_code=500, detail=str(exc))


async def generate_chat_title(query: str) -> str:
    """
    Generate a short 3-4 word title for a new chat session.
    """
    fallback_title = query[:30].strip() + ("..." if len(query) > 30 else "")
    try:
        title_template = (
            "You are an expert summarizer. Provide a concise 2 to 4 word title for the following conversation starter.\n"
            "Rules:\n"
            "1. Output ONLY the raw title words.\n"
            "2. NO quotation marks.\n"
            "3. NO conversational phrasing (Do NOT say 'Here is the title').\n\n"
            "Conversation starter: {query}\n\nTitle:"
        )
        title_prompt = PromptTemplate.from_template(title_template)
        title_chain = title_prompt | llm | StrOutputParser()

        title = title_chain.invoke({"query": query})
        title = title.strip().strip('"').strip("'").replace('\n', ' ')
        
        if len(title.split()) > 7 or "Here is" in title or "title is" in title:
            return fallback_title
            
        return title
    except Exception as exc:
        print(f"ERROR [chat_title]: {exc}")
        return fallback_title
