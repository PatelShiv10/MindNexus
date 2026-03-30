import os
import re
import json
import uuid

import edge_tts
from mutagen.mp3 import MP3
from langchain_core.messages import SystemMessage, HumanMessage

from core.config import settings
from core.llm import llm_podcast, PODCAST_SYSTEM_PROMPT


def generate_script(text: str) -> list[dict]:
    """
    Use the podcast LLM to generate a dynamic host dialogue from the document
    text. Tries multiple parse strategies to handle imperfect LLM outputs.
    """
    user_message = (
        "Here is the source material for today's episode. "
        "Turn it into a full, engaging podcast conversation following your instructions exactly.\n\n"
        f"SOURCE MATERIAL:\n{text}"
    )
    messages = [
        SystemMessage(content=PODCAST_SYSTEM_PROMPT),
        HumanMessage(content=user_message),
    ]

    response = llm_podcast.invoke(messages)
    raw = response.content.strip()
    print(f"DEBUG [podcast]: Raw LLM output: {len(raw)} chars")

    if "```" in raw:
        raw = re.sub(r"```(?:json)?", "", raw).replace("```", "").strip()

    match = re.search(r"\[.*\]", raw, re.DOTALL)
    if match:
        raw = match.group(0)

    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        pass

    try:
        pairs = re.findall(
            r'\{\s*"speaker"\s*:\s*"(.*?)"\s*,\s*"text"\s*:\s*"(.*?)"\s*\}',
            raw,
            re.DOTALL,
        )
        if pairs:
            return [{"speaker": s, "text": t} for s, t in pairs]
    except Exception:
        pass

    try:
        lines = []
        for line in raw.splitlines():
            line = line.strip()
            if line.startswith("Alex:"):
                lines.append({"speaker": "Alex", "text": line[5:].strip()})
            elif line.startswith("Sam:"):
                lines.append({"speaker": "Sam", "text": line[4:].strip()})
        if lines:
            print(f"DEBUG [podcast]: Parsed {len(lines)} lines from plain-text block.")
            return lines
    except Exception:
        pass

    print("WARNING [podcast]: Could not parse LLM output — using placeholder.")
    return [
        {"speaker": "Alex", "text": "Welcome back to MindNexus Deep Dive! Today we've got something really fascinating to break down."},
        {"speaker": "Sam", "text": "Honestly, I've been looking forward to this one. Let's get into it."},
        {"speaker": "Alex", "text": "Let's dive right in and unpack the key ideas together."},
    ]


async def synthesize_audio(
    script: list[dict],
    filename: str,
    node_ids: list[str],
) -> tuple[str, list[dict]]:
    """
    Convert a podcast script into a single MP3 file (via edge-tts) and build
    an audio/graph sync timeline.

    Returns:
        (filename, timeline)  — timeline is a list of {"time": float, "nodeId": str}
    """
    output_dir = settings.AUDIO_DIR
    os.makedirs(output_dir, exist_ok=True)

    file_path = os.path.join(output_dir, filename)
    timeline_path = os.path.join(output_dir, filename.replace(".mp3", ".json"))

    # Sort node IDs longest-first so we prefer the most specific match.
    # e.g. "Machine Learning" beats "Learning", "Neural Network" beats "Network".
    sorted_node_ids = sorted(node_ids, key=len, reverse=True)

    timeline: list[dict] = []
    current_offset = 0.0
    temp_files: list[str] = []

    try:
        for i, item in enumerate(script):
            text = item.get("text", "").strip()
            if not text:
                continue

            voice = (
                "en-US-BrianNeural" if item["speaker"] == "Alex"
                else "en-US-EmmaNeural"
            )
            temp_file = os.path.join(output_dir, f"chunk_{uuid.uuid4()}.mp3")
            temp_files.append(temp_file)

            comm = edge_tts.Communicate(text, voice)
            await comm.save(temp_file)

            # Find the most specific (longest) node name mentioned in this segment.
            text_lower = text.lower()
            best_match = None
            for node_id in sorted_node_ids:
                node_lower = node_id.lower()
                # Skip very short names (≤ 2 chars) — too generic to be meaningful
                if len(node_lower) <= 2:
                    continue
                if node_lower in text_lower:
                    best_match = node_id
                    break  # Already sorted longest-first, so first hit is best

            if best_match:
                timeline.append({"time": current_offset, "nodeId": best_match})

            try:
                current_offset += MP3(temp_file).info.length
            except Exception as e:
                print(f"WARNING [podcast]: Duration calc failed for chunk {i}: {e}")
                try:
                    current_offset += os.path.getsize(temp_file) / 16000
                except Exception:
                    pass

        with open(file_path, "wb") as final:
            for temp_file in temp_files:
                try:
                    with open(temp_file, "rb") as f:
                        final.write(f.read())
                except Exception as e:
                    print(f"ERROR [podcast]: Could not read chunk {temp_file}: {e}")

        with open(timeline_path, "w") as f:
            json.dump(timeline, f)

        return filename, timeline

    except Exception as exc:
        if os.path.exists(file_path):
            try:
                os.remove(file_path)
            except Exception:
                pass
        raise exc

    finally:
        for temp_file in temp_files:
            if os.path.exists(temp_file):
                try:
                    os.remove(temp_file)
                except Exception as e:
                    print(f"WARNING [podcast]: Could not remove temp file {temp_file}: {e}")
