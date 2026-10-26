"""Render PNG previews of the priority areas, straight from the generated PDFs.

    python render_screenshots.py

These are navigation aids — they show the manager *where* to look. They do not
replace opening the PDF: a preview is a raster of the page at 144 dpi and
cannot show whether the text under it is real, extractable text.

Rendering is done by pymupdf from the already-generated files. No Word, no
LibreOffice, and the PDFs themselves are never touched.
"""

from __future__ import annotations

import json
import os
import sys

import fitz  # pymupdf

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
SHOTS = os.path.join(ROOT, "screenshots")
ZOOM = 2.0  # 144 dpi

# Which generated case to preview, which page, and the band worth looking at.
# `crop` is a fraction of the page height (top, bottom); None means the page.
TARGETS = [
    {"key": "poa-company-intro", "documentId": "power-of-attorney",
     "subjectKind": "company", "page": 0, "crop": (0.05, 0.45),
     "title": "Доверенность ЮЛ — вводный блок",
     "look": "Company name, ОГРН and ИНН on their underlines; the block "
             "wraps and the lines below move down with it."},
    {"key": "poa-individual-intro", "documentId": "power-of-attorney",
     "subjectKind": "individual", "page": 2, "crop": (0.05, 0.45),
     "title": "Доверенность ФЛ — вводный блок",
     "look": "Principal and attorney identity; the paragraph is justified and "
             "the following text moves as a whole."},
    {"key": "accession-yul-applicant", "documentId": "accession-application-yul",
     "subjectKind": "company", "page": 0, "crop": (0.05, 0.35),
     "title": "Заявление о присоединении ЮЛ — блок заявителя",
     "look": "The long legal name stays attached to its label and the "
             "applicant block grows downwards."},
    {"key": "table-cell-expansion", "documentId": "anketa-yul",
     "subjectKind": "company", "page": 2, "crop": (0.15, 0.55),
     "title": "Анкета ЮЛ — расширенная ячейка таблицы",
     "look": "The cell has gained a row: its bottom border moved with the "
             "text and the table below it stayed aligned."},
    {"key": "cross-page-flow", "documentId": "client-notifications",
     "subjectKind": "individual", "page": 8, "crop": None,
     "title": "Уведомления клиента — межстраничный перенос",
     "look": "The identity block on page 9; its continuation must read "
             "naturally onto page 10, with the footer unmoved."},
]


def pick(items, target):
    """The best generated case for a target: prefer a priority long one."""
    candidates = [i for i in items
                  if i["documentId"] == target["documentId"]
                  and i["subjectKind"] == target["subjectKind"]
                  and i["pdfFilename"]]
    if not candidates:
        return None
    for wanted in (lambda i: i["crossPageRuleExercised"] and i["priority"],
                   lambda i: (i["expectedInsertedLines"] or 0) > 0 and i["priority"],
                   lambda i: (i["expectedInsertedLines"] or 0) > 0,
                   lambda i: i["priority"],
                   lambda i: True):
        hit = [i for i in candidates if wanted(i)]
        if hit:
            return sorted(hit, key=lambda i: -(i["expectedInsertedLines"] or 0))[0]
    return None


def main() -> int:
    os.makedirs(SHOTS, exist_ok=True)
    with open(os.path.join(ROOT, "manifest.json"), encoding="utf-8") as fh:
        items = json.load(fh)["items"]

    index = []
    for target in TARGETS:
        item = pick(items, target)
        if not item:
            print(f"skip {target['key']}: no generated case")
            continue
        pdf_path = os.path.join(ROOT, item["pdfPath"])
        document = fitz.open(pdf_path)
        page_no = min(target["page"], document.page_count - 1)
        page = document[page_no]
        clip = None
        if target["crop"]:
            top, bottom = target["crop"]
            rect = page.rect
            clip = fitz.Rect(rect.x0, rect.y0 + rect.height * top,
                             rect.x1, rect.y0 + rect.height * bottom)
        pixmap = page.get_pixmap(matrix=fitz.Matrix(ZOOM, ZOOM), clip=clip)
        name = f"{target['key']}.png"
        pixmap.save(os.path.join(SHOTS, name))
        document.close()

        index.append({
            "key": target["key"], "png": name, "title": target["title"],
            "whatToLookAt": target["look"],
            "fromPdf": item["pdfFilename"], "pdfPath": item["pdfPath"],
            "page": page_no + 1,
            "documentId": item["documentId"],
            "subjectKind": item["subjectKind"],
            "scenario": item["scenario"],
            "insertedLines": item["expectedInsertedLines"],
            "crossPageActive": item["crossPageRuleExercised"],
        })
        print(f"{name:28s} <- {item['pdfFilename']} p.{page_no + 1}")

    with open(os.path.join(SHOTS, "screenshots.json"), "w",
              encoding="utf-8") as fh:
        json.dump({"synthetic": True, "dpi": int(72 * ZOOM),
                   "screenshots": index}, fh, ensure_ascii=False, indent=1)
    print(f"\n{len(index)} preview(s) -> {SHOTS}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
