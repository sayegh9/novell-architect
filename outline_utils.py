"""Shared helpers for extracting chapter entries from Markdown outlines."""

import re
from dataclasses import dataclass


FINAL_CHAPTER_MESSAGE = (
    "This is the final chapter; there is no next chapter outline."
)

_ARABIC_NUMBER_WORDS = {
    "الأول": 1,
    "الثاني": 2,
    "الثالث": 3,
    "الرابع": 4,
    "الخامس": 5,
    "السادس": 6,
    "السابع": 7,
    "الثامن": 8,
    "التاسع": 9,
    "العاشر": 10,
    "الحادي عشر": 11,
    "الثاني عشر": 12,
    "الثالث عشر": 13,
    "الرابع عشر": 14,
    "الخامس عشر": 15,
    "السادس عشر": 16,
    "السابع عشر": 17,
    "الثامن عشر": 18,
    "التاسع عشر": 19,
    "العشرون": 20,
    "الحادي والعشرون": 21,
    "الثاني والعشرون": 22,
    "الثالث والعشرون": 23,
    "الرابع والعشرون": 24,
}

_CHAPTER_HEADING_RE = re.compile(
    r"^(?P<marks>#{1,6})[ \t]+(?:\*{1,2})?[ \t]*"
    r"(?:Chapter|Ch|الفصل|فصل)\b(?P<remainder>[^\n]*)$",
    re.IGNORECASE | re.MULTILINE,
)
_MARKDOWN_HEADING_RE = re.compile(r"^(?P<marks>#{1,6})(?:[ \t]+|$)", re.MULTILINE)
_DIGIT_RE = re.compile(r"^(?P<number>[0-9\u0660-\u0669\u06f0-\u06f9]+)(?=$|[\s:：\-–—])")


@dataclass(frozen=True)
class _ChapterHeading:
    start: int
    end: int
    level: int
    chapter_num: int


def _parse_chapter_number(remainder: str) -> int | None:
    remainder = remainder.strip()
    numeric_match = _DIGIT_RE.match(remainder)
    if numeric_match:
        return int(numeric_match.group("number"))

    for words, number in sorted(
        _ARABIC_NUMBER_WORDS.items(), key=lambda item: len(item[0]), reverse=True
    ):
        if remainder == words or (
            remainder.startswith(words)
            and remainder[len(words) : len(words) + 1] in (" ", ":", "：", "-", "–", "—")
        ):
            return number
    return None


def _chapter_headings(outline_text: str) -> list[_ChapterHeading]:
    headings = []
    for match in _CHAPTER_HEADING_RE.finditer(outline_text):
        chapter_num = _parse_chapter_number(match.group("remainder"))
        if chapter_num is not None:
            headings.append(
                _ChapterHeading(
                    start=match.start(),
                    end=match.end(),
                    level=len(match.group("marks")),
                    chapter_num=chapter_num,
                )
            )
    return headings


def _extract_heading_section(
    outline_text: str, selected_heading: _ChapterHeading
) -> str:
    section_end = _heading_section_end(outline_text, selected_heading)

    content = outline_text[selected_heading.start:section_end].strip()
    return re.sub(r"\n+---+\s*$", "", content).strip()


def _heading_section_end(
    outline_text: str, selected_heading: _ChapterHeading
) -> int:
    for match in _MARKDOWN_HEADING_RE.finditer(outline_text, selected_heading.end):
        if len(match.group("marks")) <= selected_heading.level:
            return match.start()
    return len(outline_text)


def find_chapter_outline(outline_text: str, chapter_num: int) -> str | None:
    """Return one Markdown chapter section, or ``None`` when it is absent."""
    for heading in _chapter_headings(outline_text):
        if heading.chapter_num == chapter_num:
            return _extract_heading_section(outline_text, heading)
    return None


def extract_chapter_outline(outline_text: str, chapter_num: int) -> str:
    """Return one Markdown chapter section or a stable fallback string."""
    section = find_chapter_outline(outline_text, chapter_num)
    return section if section is not None else f"Chapter {chapter_num} beats from outline"


def replace_chapter_outline(
    outline_text: str, chapter_num: int, replacement: str
) -> str:
    """Replace exactly one chapter section while preserving all other text."""
    if chapter_num < 1:
        raise ValueError("Chapter number must be a positive integer")

    normalized = replacement.strip()
    if not normalized:
        raise ValueError("Chapter beats must not be empty")

    replacement_headings = _chapter_headings(normalized)
    if len(replacement_headings) != 1:
        raise ValueError("Chapter beats must contain exactly one chapter heading")

    replacement_heading = replacement_headings[0]
    if replacement_heading.start != 0:
        raise ValueError("Chapter beats must begin with a chapter heading")
    if replacement_heading.chapter_num != chapter_num:
        raise ValueError(f"Chapter beats heading must identify Chapter {chapter_num}")
    if _heading_section_end(normalized, replacement_heading) != len(normalized):
        raise ValueError("Chapter beats must contain exactly one Markdown section")

    matches = [
        heading
        for heading in _chapter_headings(outline_text)
        if heading.chapter_num == chapter_num
    ]
    if not matches:
        raise LookupError(f"Chapter {chapter_num} section not found in outline.md")
    if len(matches) != 1:
        raise ValueError(
            f"outline.md must contain exactly one Chapter {chapter_num} section"
        )

    selected_heading = matches[0]
    section_end = _heading_section_end(outline_text, selected_heading)
    suffix = outline_text[section_end:]
    separator = "\n\n" if suffix else "\n"
    return outline_text[: selected_heading.start] + normalized + separator + suffix


def extract_next_chapter_outline(outline_text: str, chapter_num: int) -> str:
    """Return the next chapter section, with an explicit final-chapter marker."""
    headings = _chapter_headings(outline_text)
    for heading in headings:
        if heading.chapter_num == chapter_num + 1:
            return _extract_heading_section(outline_text, heading)

    if headings and chapter_num >= max(heading.chapter_num for heading in headings):
        return FINAL_CHAPTER_MESSAGE
    return f"Chapter {chapter_num + 1} beats from outline"
