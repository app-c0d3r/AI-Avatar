import pytest
import json
import asyncio
from emo_parser import parse_emo_tag, emo_buffered_stream


def test_parse_clean_tag():
    assert parse_emo_tag("[EMO:happy:medium]") == ("happy", "medium")


def test_parse_high_intensity():
    assert parse_emo_tag("[EMO:excited:high]") == ("excited", "high")


def test_parse_case_insensitive():
    assert parse_emo_tag("[EMO:Happy:HIGH]") == ("happy", "high")


def test_parse_with_internal_spaces():
    assert parse_emo_tag("[ Emo : Happy : High ]") == ("happy", "high")


def test_parse_unknown_emotion_defaults_to_neutral():
    assert parse_emo_tag("[EMO:confused:medium]") == ("neutral", "medium")


def test_parse_unknown_intensity_defaults_to_medium():
    assert parse_emo_tag("[EMO:happy:extreme]") == ("happy", "medium")


def test_parse_malformed_returns_neutral_medium():
    assert parse_emo_tag("no tag here") == ("neutral", "medium")


def test_parse_all_valid_emotions():
    emotions = [
        "neutral", "wave", "happy", "excited", "thinking",
        "sad", "surprised", "bow", "explaining", "embarrassed", "confident"
    ]
    for e in emotions:
        result_emotion, _ = parse_emo_tag(f"[EMO:{e}:medium]")
        assert result_emotion == e, f"Failed for emotion: {e}"


async def collect(gen) -> list[str]:
    """Helper: drain an async generator into a list."""
    return [item async for item in gen]


async def mock_stream(chunks: list[str]):
    """Simulate what stream_with_fallback yields: data: {"content": "..."} lines."""
    for chunk in chunks:
        yield f"data: {json.dumps({'content': chunk})}\n\n"
    yield "data: [DONE]\n\n"


def test_extracts_emotion_from_fragmented_tag():
    """Tag split across multiple chunks — must buffer and parse correctly."""
    chunks = ["[EMO", ":happy:medium]", "Hello there"]
    events = asyncio.run(collect(emo_buffered_stream(mock_stream(chunks))))

    assert events[0] == 'event: emotion\ndata: {"emotion": "happy", "intensity": "medium"}\n\n'
    assert events[1] == 'event: message\ndata: {"content": "Hello there"}\n\n'
    assert events[-1] == "data: [DONE]\n\n"


def test_fallback_when_no_tag_in_60_chars():
    """If ] not found in first 60 chars, emits neutral/medium and flushes buffer."""
    long_preamble = "Sure, I would be happy to help you with that question today!!"
    assert len(long_preamble) > 60
    chunks = [long_preamble, " More content."]
    events = asyncio.run(collect(emo_buffered_stream(mock_stream(chunks))))

    assert events[0] == 'event: emotion\ndata: {"emotion": "neutral", "intensity": "medium"}\n\n'
    assert "event: message" in events[1]
    assert long_preamble in events[1]


def test_done_preserved_without_event_type():
    """[DONE] must NOT have an event: type prefix."""
    chunks = ["[EMO:neutral:medium]Hi"]
    events = asyncio.run(collect(emo_buffered_stream(mock_stream(chunks))))
    assert events[-1] == "data: [DONE]\n\n"


def test_content_after_tag_streams_as_message_events():
    """All content after the tag must be wrapped in event: message."""
    chunks = ["[EMO:sad:low]I'm sorry", " to hear that."]
    events = asyncio.run(collect(emo_buffered_stream(mock_stream(chunks))))
    message_events = [e for e in events if e.startswith("event: message")]
    assert len(message_events) >= 1
    combined = "".join(message_events)
    assert "I'm sorry" in combined
