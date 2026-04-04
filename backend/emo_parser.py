import json
import logging
import re
from typing import AsyncGenerator

logger = logging.getLogger(__name__)

VALID_EMOTIONS = {
    'neutral', 'wave', 'happy', 'excited', 'thinking',
    'sad', 'surprised', 'bow', 'explaining', 'embarrassed', 'confident'
}
VALID_INTENSITIES = {'low', 'medium', 'high'}

EMO_BUFFER_LIMIT = 60  # chars — fallback if ] not found within this many buffered characters

EMO_INSTRUCTION = (
    "CRITICAL: Your response MUST begin with exactly: [EMO:emotion:intensity]\n"
    "emotion = one of: neutral wave happy excited thinking sad surprised "
    "bow explaining embarrassed confident\n"
    "intensity = low | medium | high\n"
    "No preamble. No greeting. No filler before the bracket.\n"
    "Example: [EMO:happy:medium]Here is the answer..."
)


def parse_emo_tag(raw: str) -> tuple[str, str]:
    """Parse [EMO:emotion:intensity] tag. Aggressively forgiving - strips whitespace, lowercases."""
    cleaned = re.sub(r'\s', '', raw).lower()
    match = re.search(r'\[emo:([^:]+):([^\]]+)\]', cleaned)
    if not match:
        return 'neutral', 'medium'
    emotion = match.group(1) if match.group(1) in VALID_EMOTIONS else 'neutral'
    intensity = match.group(2) if match.group(2) in VALID_INTENSITIES else 'medium'
    return emotion, intensity


def inject_emo_instruction(messages: list[dict]) -> list[dict]:
    """Append the EMO tag instruction as the last system message."""
    return list(messages) + [{"role": "system", "content": EMO_INSTRUCTION}]


def _emo_event(emotion: str, intensity: str) -> str:
    return f"event: emotion\ndata: {json.dumps({'emotion': emotion, 'intensity': intensity})}\n\n"


def _msg_event(content: str) -> str:
    return f"event: message\ndata: {json.dumps({'content': content})}\n\n"


def _extract_content(raw_sse_line: str) -> str:
    """Pull the content string out of a data: {"content": "..."} SSE chunk."""
    if not raw_sse_line.startswith("data: "):
        return ""
    payload = raw_sse_line[6:].strip()
    if payload == "[DONE]":
        return ""
    try:
        return json.loads(payload).get("content", "")
    except (json.JSONDecodeError, AttributeError):
        return ""


async def emo_buffered_stream(raw_gen) -> AsyncGenerator[str, None]:
    """
    Wrap any SSE generator to intercept and strip the [EMO:emotion:intensity] tag.
    Emits a structured 'event: emotion' SSE before streaming content.
    Preserves the [DONE] terminator without an event type.
    """
    buffer = ""
    tag_done = False

    async for raw_chunk in raw_gen:
        if raw_chunk.strip() == "data: [DONE]":
            yield "data: [DONE]\n\n"
            return

        if not tag_done:
            text = _extract_content(raw_chunk)
            buffer += text

            if "]" in buffer:
                end_idx = buffer.index("]") + 1
                tag_str = buffer[:end_idx]
                remainder = buffer[end_idx:]
                emotion, intensity = parse_emo_tag(tag_str)
                yield _emo_event(emotion, intensity)
                if remainder:
                    yield _msg_event(remainder)
                tag_done = True

            elif len(buffer) > EMO_BUFFER_LIMIT:
                logger.warning("EMO tag not found in first %d chars - defaulting to neutral/medium", EMO_BUFFER_LIMIT)
                yield _emo_event("neutral", "medium")
                yield _msg_event(buffer)
                tag_done = True
        else:
            text = _extract_content(raw_chunk)
            if text:
                yield _msg_event(text)
