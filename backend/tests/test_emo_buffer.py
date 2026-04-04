import pytest
from main import parse_emo_tag


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
