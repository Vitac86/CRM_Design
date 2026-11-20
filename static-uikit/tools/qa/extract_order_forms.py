"""Extract the reviewed November 2026 Appendix 7 pages, including their PDF tags.

    python static-uikit/tools/qa/extract_order_forms.py regulation.pdf --out <directory>
"""
import argparse
import hashlib
import io
from pathlib import Path

import fitz
from pypdf import PdfReader, PdfWriter
from pypdf.generic import ArrayObject, DictionaryObject, IndirectObject, NameObject, NumberObject

SOURCE_SHA256 = "c5ecbd600c9f4da7fd1d95386260165f437691ce1771eee05994111e7775238e"
PAGES = {"order-trade": (122, 123), "order-venue-transfer": (124, 124), "order-bank-withdrawal": (125, 125)}


def number_tree(node):
    if "/Nums" in node:
        values = node["/Nums"]
        yield from zip(values[::2], values[1::2])
    for child in node.get("/Kids", []):
        yield from number_tree(child.get_object())


def children(node):
    values = node.get("/K", [])
    return values if isinstance(values, (list, ArrayObject)) else [values]


def extract(reader, first, last):
    writer = PdfWriter()
    writer.pdf_header = reader.pdf_header
    root = reader.trailer["/Root"]
    original = root["/StructTreeRoot"]
    parents = dict(number_tree(original["/ParentTree"]))
    page_refs, rows, nodes, marked = {}, [], set(), set()
    # /ActualText on two cash-form spans lives in the tagged structure, outside
    # the page content. Keep exactly the selected marked content and its ancestors.
    for page in reader.pages[first - 1:last]:
        copied = writer.add_page(page)
        page_refs[page.indirect_reference.idnum] = copied.indirect_reference
        copied[NameObject("/StructParents")] = NumberObject(len(rows))
        row = parents[page["/StructParents"]].get_object()
        rows.append(row)
        for mcid, ref in enumerate(row):
            marked.add((ref.idnum, mcid))
            while ref.idnum not in nodes and ref.idnum != original.indirect_reference.idnum:
                nodes.add(ref.idnum)
                ref = ref.get_object().raw_get("/P")

    tree = DictionaryObject({NameObject("/Type"): NameObject("/StructTreeRoot")})
    refs = {original.indirect_reference.idnum: writer._add_object(tree)}
    for n in sorted(nodes):
        refs[n] = writer._add_object(DictionaryObject())
    for n in sorted(nodes):
        old = reader.get_object(n)
        new = refs[n].get_object()
        for key in ("/Type", "/S", "/ActualText", "/Alt", "/Lang", "/T"):
            if key in old:
                new[NameObject(key)] = old[key].clone(writer)
        new[NameObject("/P")] = refs[old.raw_get("/P").idnum]
        if "/Pg" in old:
            pg = page_refs.get(old.raw_get("/Pg").idnum)
            if pg is not None:
                new[NameObject("/Pg")] = pg
        kept = ArrayObject()
        for k in children(old):
            if isinstance(k, IndirectObject) and k.idnum in nodes:
                kept.append(refs[k.idnum])
            elif isinstance(k, NumberObject) and (n, int(k)) in marked:
                kept.append(NumberObject(k))
        new[NameObject("/K")] = kept
    tree[NameObject("/K")] = ArrayObject([refs[k.idnum] for k in children(original) if k.idnum in nodes])
    tree[NameObject("/RoleMap")] = original["/RoleMap"].clone(writer)
    entries = ArrayObject()
    for index, row in enumerate(rows):
        entries.extend([NumberObject(index), ArrayObject([refs[ref.idnum] for ref in row])])
    tree[NameObject("/ParentTree")] = writer._add_object(DictionaryObject({NameObject("/Nums"): entries}))
    tree[NameObject("/ParentTreeNextKey")] = NumberObject(len(rows))
    writer.root_object[NameObject("/StructTreeRoot")] = refs[original.indirect_reference.idnum]
    for key in ("/MarkInfo", "/Lang"):
        if key in root:
            writer.root_object[NameObject(key)] = root[key].clone(writer)
    data = io.BytesIO()
    writer.write(data)
    return data.getvalue()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path)
    parser.add_argument("--out", required=True, type=Path)
    args = parser.parse_args()
    if hashlib.sha256(args.source.read_bytes()).hexdigest() != SOURCE_SHA256:
        parser.error("The input is not the reviewed November 2026 regulation.")
    reader = PdfReader(args.source)
    outputs = {}
    with fitz.open(args.source) as regulation:
        for name, (first, last) in PAGES.items():
            data = extract(reader, first, last)
            with fitz.open(stream=data, filetype="pdf") as verified:
                assert len(verified) == last - first + 1
                for i, page in enumerate(verified):
                    original = regulation[first - 1 + i]
                    if not (page.rotation == original.rotation and page.cropbox == original.cropbox
                            and page.get_text() == original.get_text()
                            and page.read_contents() == original.read_contents()
                            and page.get_pixmap(dpi=160).samples == original.get_pixmap(dpi=160).samples):
                        raise ValueError(f"Source content or raster differs on page {first+i}")
            outputs[name] = data
    args.out.mkdir(parents=True, exist_ok=True)
    for name, data in outputs.items():
        (args.out / (name + ".pdf")).write_bytes(data)
        print(f"{name}  {len(data)} bytes  {hashlib.sha256(data).hexdigest()}")


if __name__ == "__main__":
    main()
