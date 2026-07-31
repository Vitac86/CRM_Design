"""Compare every reviewed Word-flow block with its authoritative PDF text.

The production renderer already rejects byte/hash drift before drawing.  This
gate adds the legal-text invariant: after blank underscores are treated as
geometry and whitespace is normalised, the source q…Q range, the configured
``sourceStaticText`` and the block's static runs must have the same token
sequence.

    python static-uikit/tools/qa/check_word_flow_static_equivalence.py
"""

from __future__ import annotations

import os
import re
import sys
from collections import defaultdict

from pypdf import PdfReader

from dump_field_maps import dump
from headless_browser import STATIC_UIKIT


TEMPLATES = os.path.join(STATIC_UIKIT, "assets", "document-pdf-templates")
WORD_OR_PUNCTUATION = re.compile(r"[^\W_]+|[^\s\w]", re.UNICODE)


def tokens(value: str) -> list[str]:
    """Mirror pdf-text-layout.js staticTokenSequence."""
    normal = re.sub(r"_+", " ", str(value or ""))
    normal = normal.replace("\u00a0", " ").replace("\u2007", " ").replace("\u202f", " ")
    normal = re.sub(r"\s+", " ", normal).strip()
    return WORD_OR_PUNCTUATION.findall(normal)


def static_text_of_runs(runs: list[dict]) -> str:
    parts: list[str] = []
    for run in runs:
        kind = run.get("type", "static")
        if kind == "static":
            parts.append(str(run.get("text", "")))
        elif kind == "space":
            parts.append(" ")
        elif kind in ("lineBreak", "hardLineBreak", "paragraphBreak"):
            parts.append("\n")
    return "".join(parts)


def operator_block_text(page) -> tuple[int, dict[int, str]]:
    """Return one-based top-level q…Q text, using pypdf's real font maps."""
    state = {"depth": 0, "ordinal": 0, "current": None}
    pieces: dict[int, list[str]] = defaultdict(list)

    def before(operator, _operands, _cm, _tm):
        if operator == b"q":
            if state["depth"] == 0:
                state["ordinal"] += 1
                state["current"] = state["ordinal"]
            state["depth"] += 1
        elif operator == b"Q":
            state["depth"] = max(0, state["depth"] - 1)
            if state["depth"] == 0:
                state["current"] = None

    def visit_text(text, _cm, _tm, _font, _size):
        current = state["current"]
        if current is not None:
            pieces[current].append(text)

    page.extract_text(
        visitor_operand_before=before,
        visitor_text=visit_text,
    )
    return state["ordinal"], {key: "".join(value) for key, value in pieces.items()}


def context(sequence: list[str], limit: int = 18) -> str:
    return " ".join(sequence[:limit]) + (" …" if len(sequence) > limit else "")


def main() -> int:
    maps = dump()
    readers: dict[str, PdfReader] = {}
    page_cache: dict[tuple[str, int], tuple[int, dict[int, str]]] = {}
    failures: list[str] = []
    checked = 0

    for template_id, template in sorted(maps.items()):
        blocks = template.get("wordFlowBlocks", [])
        if not blocks:
            continue
        filename = os.path.basename(template["templateUrl"])
        if filename not in readers:
            readers[filename] = PdfReader(os.path.join(TEMPLATES, filename))

        for block in blocks:
            replacement = block.get("sourceReplacement", {})
            page_index = int(block["page"])
            cache_key = (filename, page_index)
            if cache_key not in page_cache:
                page_cache[cache_key] = operator_block_text(
                    readers[filename].pages[page_index]
                )
            total, by_block = page_cache[cache_key]
            first = int(replacement.get("firstBlock", 0))
            last = int(replacement.get("lastBlock", 0))
            expected_total = replacement.get("expectedPageBlockCount")
            if expected_total is not None and int(expected_total) != total:
                failures.append(
                    f"{template_id}/{block['id']}: page block count "
                    f"{total} != {expected_total}"
                )
                continue

            source = "".join(by_block.get(number, "") for number in range(first, last + 1))
            source_tokens = tokens(source)
            configured_tokens = tokens(block.get("sourceStaticText", ""))
            run_tokens = tokens(static_text_of_runs(block.get("runs", [])))
            checked += 1

            if source_tokens != configured_tokens:
                failures.append(
                    f"{template_id}/{block['id']}: source/config tokens differ\n"
                    f"  source: {context(source_tokens)}\n"
                    f"  config: {context(configured_tokens)}"
                )
            if configured_tokens != run_tokens:
                failures.append(
                    f"{template_id}/{block['id']}: config/run tokens differ\n"
                    f"  config: {context(configured_tokens)}\n"
                    f"  runs:   {context(run_tokens)}"
                )

    if failures:
        for failure in failures:
            print("FAIL", failure)
        print(f"\nWord-flow static equivalence: {checked - len(failures)}/{checked} passed")
        return 1

    print(f"Word-flow static equivalence: {checked}/{checked} blocks passed")
    return 0


if __name__ == "__main__":
    sys.exit(main())
