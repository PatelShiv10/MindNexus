import os
os.environ["SCARF_NO_ANALYTICS"] = "true"
import shutil
import base64
import io

from fastapi import UploadFile, HTTPException, BackgroundTasks
from langchain_core.messages import HumanMessage
from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_chroma import Chroma

from core.config import settings
from core.chroma import chroma_client
from core.llm import embedding_function, llm_vision

from youtube_transcript_api import YouTubeTranscriptApi
from pytube import YouTube


def _describe_image(b64_data: str, mime: str = "jpeg") -> str:
    """Call Vision LLM to describe a base64-encoded image. Returns description or empty string."""
    try:
        msg = HumanMessage(
            content=[
                {
                    "type": "text",
                    "text": (
                        "Describe this educational image, chart, or slide in extreme detail "
                        "so that a student can fully understand its contents through text alone."
                    ),
                },
                {
                    "type": "image_url",
                    "image_url": {"url": f"data:image/{mime};base64,{b64_data}"},
                },
            ]
        )
        response = llm_vision.invoke([msg])
        return response.content.strip()
    except Exception as e:
        print(f"WARNING: Vision LLM failed: {e}")
        return ""


def _parse_pdf(path: str) -> list[Document]:
    """Extract text (and optionally image descriptions) from a PDF using pypdfium2."""
    import pypdfium2 as pdfium  # fast, zero-hang, no internet calls

    docs: list[Document] = []
    pdf = pdfium.PdfDocument(path)
    for page_num in range(len(pdf)):
        page = pdf[page_num]

        # --- Text extraction ---
        text = page.get_textpage().get_text_range().strip()
        if text:
            docs.append(Document(page_content=text, metadata={"page": page_num + 1}))

        # --- Image extraction (render page at 150 DPI → base64) ---
        try:
            bitmap = page.render(scale=150 / 72)
            pil_img = bitmap.to_pil()
            buf = io.BytesIO()
            pil_img.save(buf, format="JPEG", quality=85)
            b64 = base64.b64encode(buf.getvalue()).decode()
            # Only call vision if the page is probably image-heavy (little text)
            if len(text) < 200:
                desc = _describe_image(b64, "jpeg")
                if desc:
                    docs.append(Document(
                        page_content=f"[Image Description: {desc}]",
                        metadata={"page": page_num + 1, "type": "image"},
                    ))
        except Exception as e:
            print(f"WARNING: PDF image render failed (page {page_num + 1}): {e}")

    pdf.close()
    return docs


def _parse_pptx(path: str) -> list[Document]:
    """Extract text and image descriptions from a PPTX file."""
    from pptx import Presentation

    docs: list[Document] = []
    prs = Presentation(path)

    for slide_num, slide in enumerate(prs.slides, start=1):
        slide_texts: list[str] = []

        for shape in slide.shapes:
            # Text
            if shape.has_text_frame:
                for para in shape.text_frame.paragraphs:
                    t = para.text.strip()
                    if t:
                        slide_texts.append(t)

            # Images embedded as picture shapes
            if shape.shape_type == 13:  # MSO_SHAPE_TYPE.PICTURE
                try:
                    img_bytes = shape.image.blob
                    b64 = base64.b64encode(img_bytes).decode()
                    ext = shape.image.ext.lower()
                    mime = "jpeg" if ext in ("jpg", "jpeg") else ext
                    desc = _describe_image(b64, mime)
                    if desc:
                        slide_texts.append(f"[Image Description: {desc}]")
                except Exception as e:
                    print(f"WARNING: PPTX image extraction failed (slide {slide_num}): {e}")

        if slide_texts:
            docs.append(Document(
                page_content="\n".join(slide_texts),
                metadata={"slide": slide_num},
            ))

    return docs


def _parse_docx(path: str) -> list[Document]:
    """Extract text and inline image descriptions from a DOCX file."""
    from docx import Document as DocxDocument
    from docx.oxml.ns import qn

    docx = DocxDocument(path)
    docs: list[Document] = []

    all_text: list[str] = []
    for para in docx.paragraphs:
        text = para.text.strip()
        if text:
            all_text.append(text)

        # Check for inline images inside the paragraph
        for run in para.runs:
            for drawing in run._element.findall(f".//{qn('a:blip')}", namespaces=run._element.nsmap):
                try:
                    rId = drawing.get("{http://schemas.openxmlformats.org/officeDocument/2006/relationships}embed")
                    if rId:
                        image_part = docx.part.related_parts.get(rId)
                        if image_part:
                            img_bytes = image_part.blob
                            b64 = base64.b64encode(img_bytes).decode()
                            desc = _describe_image(b64, "jpeg")
                            if desc:
                                all_text.append(f"[Image Description: {desc}]")
                except Exception as e:
                    print(f"WARNING: DOCX image failed: {e}")

    # Also capture table text
    for table in docx.tables:
        for row in table.rows:
            row_text = " | ".join(cell.text.strip() for cell in row.cells if cell.text.strip())
            if row_text:
                all_text.append(row_text)

    if all_text:
        docs.append(Document(page_content="\n".join(all_text)))

    return docs


def _parse_text(path: str) -> list[Document]:
    """Parse plain text / markdown files."""
    with open(path, "r", encoding="utf-8", errors="ignore") as f:
        content = f.read()
    return [Document(page_content=content)] if content.strip() else []


def _parse_youtube(url: str) -> tuple[str, list[Document]]:
    """Parse a YouTube URL to extract its title and time-stamped transcript."""
    try:
        yt = YouTube(url)
        video_id = yt.video_id
        title = yt.title
    except Exception as e:
        print(f"WARNING: PyTube failed to fetch metadata: {e}")
        # fallback if pytube fails (often due to cipher changes)
        import re
        match = re.search(r"(?:v=|\/)([0-9A-Za-z_-]{11}).*", url)
        if not match:
            raise ValueError("Invalid YouTube URL")
        video_id = match.group(1)
        title = f"YouTube Video ({video_id})"

    try:
        transcript = YouTubeTranscriptApi.get_transcript(video_id)
    except Exception as e:
        raise ValueError(f"Could not retrieve transcript (captions might be disabled): {e}")

    text_parts = []
    for item in transcript:
        start_seconds = item["start"]
        m, s = divmod(int(start_seconds), 60)
        h, m = divmod(m, 60)
        timestamp = f"[{h:02d}:{m:02d}:{s:02d}]" if h > 0 else f"[{m:02d}:{s:02d}]"
        text_parts.append(f"{timestamp} {item['text']}")

    full_text = "\n".join(text_parts)
    return title, [Document(page_content=full_text, metadata={"source": url, "title": title})]



async def ingest_document(
    file: UploadFile,
    doc_id: str,
    user_id: str,
    background_tasks: BackgroundTasks,
) -> dict:
    """
    Save the uploaded file, chunk & embed it into ChromaDB, then queue the
    knowledge-graph + podcast pipeline as a background task.
    """
    os.makedirs(settings.TEMP_DIR, exist_ok=True)
    temp_path = os.path.join(settings.TEMP_DIR, file.filename)

    try:
        with open(temp_path, "wb") as buf:
            shutil.copyfileobj(file.file, buf)

        fname = file.filename.lower()
        print(f"DEBUG: Parsing '{fname}'...")

        if fname.endswith(".pdf"):
            documents = _parse_pdf(temp_path)
        elif fname.endswith((".pptx", ".ppt")):
            documents = _parse_pptx(temp_path)
        elif fname.endswith((".docx", ".doc")):
            documents = _parse_docx(temp_path)
        elif fname.endswith((".txt", ".md", ".markdown")):
            documents = _parse_text(temp_path)
        else:
            raise HTTPException(
                status_code=415,
                detail=f"Unsupported file type: {fname}. Supported: PDF, DOCX, PPTX, TXT, MD",
            )

        total_chars = sum(len(d.page_content) for d in documents)
        print(f"DEBUG: Extracted {len(documents)} blocks, {total_chars} chars total.")

        if total_chars == 0:
            raise HTTPException(
                status_code=400,
                detail="Document appears to be empty or unrecognised format.",
            )

        splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
        chunks = splitter.split_documents(documents)

        for chunk in chunks:
            chunk.metadata["doc_id"] = doc_id
            chunk.metadata["source"] = file.filename

        print(f"DEBUG: Embedding {len(chunks)} chunks…")
        Chroma.from_documents(
            documents=chunks,
            embedding=embedding_function,
            persist_directory=settings.CHROMA_PATH,
            collection_name="mindnexus_docs",
        )
        print("DEBUG: Embeddings stored.")

        from services.background_service import process_graph_and_podcast
        background_tasks.add_task(process_graph_and_podcast, doc_id, user_id, chunks)
        print(f"DEBUG: Background pipeline queued for doc_id={doc_id}")

        return {"status": "success", "chunks": len(chunks)}

    except HTTPException:
        raise
    except Exception as exc:
        print(f"ERROR [ingest]: {exc}")
        raise HTTPException(status_code=500, detail=str(exc))
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)


async def ingest_youtube(
    url: str,
    doc_id: str,
    user_id: str,
    background_tasks: BackgroundTasks,
) -> dict:
    """
    Fetch a YouTube transcript, chunk & embed it into ChromaDB,
    then queue the KG + podcast pipeline.
    """
    try:
        title, documents = _parse_youtube(url)

        total_chars = sum(len(d.page_content) for d in documents)
        if total_chars == 0:
            raise HTTPException(
                status_code=400,
                detail="YouTube transcript appears to be empty.",
            )

        splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
        chunks = splitter.split_documents(documents)

        for chunk in chunks:
            chunk.metadata["doc_id"] = doc_id
            chunk.metadata["source"] = url
            chunk.metadata["title"] = title

        print(f"DEBUG: Embedding {len(chunks)} YouTube chunks…")
        Chroma.from_documents(
            documents=chunks,
            embedding=embedding_function,
            persist_directory=settings.CHROMA_PATH,
            collection_name="mindnexus_docs",
        )
        print("DEBUG: YouTube Embeddings stored.")

        from services.background_service import process_graph_and_podcast
        background_tasks.add_task(process_graph_and_podcast, doc_id, user_id, chunks)
        print(f"DEBUG: Background pipeline queued for YouTube doc_id={doc_id}")

        return {"status": "success", "chunks": len(chunks), "title": title}

    except ValueError as val_exc:
        raise HTTPException(status_code=400, detail=str(val_exc))
    except Exception as exc:
        print(f"ERROR [ingest_youtube]: {exc}")
        raise HTTPException(status_code=500, detail="Failed to ingest YouTube video.")
