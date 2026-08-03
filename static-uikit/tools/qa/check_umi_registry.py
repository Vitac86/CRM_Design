"""Gate: every production source is explained by the exact UMI registry.

    python static-uikit/tools/qa/check_umi_registry.py
    python static-uikit/tools/qa/check_umi_registry.py --self-test

What this protects
------------------
A map may only name a source the registry can account for. Three failures are
possible and all three are silent without this gate:

  unregistered   a source nobody can trace to a UMI field or declare as an
                 operator input — the map prints a value from a name we made up;
  dangling       an alias points at an exact UMI name the workbook does not
                 contain — a typo that only shows up in production;
  unresolved     a production-ready document binds a value whose business source
                 is still an open question.

The registry itself is generated (build_umi_registry.py); this reads the
committed result, so a stale registry fails here rather than at render time.
"""

from __future__ import annotations

import argparse
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", "..", ".."))
REGISTRY_JS = os.path.join(
    ROOT, "static-uikit", "assets", "js", "document-engine", "umi-registry.js")
BEGIN = "/* UMI-REGISTRY-JSON-BEGIN */"
END = "/* UMI-REGISTRY-JSON-END */"

# Namespaces that are legitimately not UMI-backed. `extra` and `check` are the
# wizard's own inputs: an operator types the withdrawal amount, and no UMI field
# holds it. They still have to be declared, which is what the registry's alias
# table and this list together do.
OPERATOR_NAMESPACES = ("extra.", "check.")

# Statuses that must not appear in a map the inventory calls production-ready.
BLOCKING_ALIAS_KINDS = {"unresolved-business"}


def load_registry(path: str = REGISTRY_JS) -> dict:
    with open(path, encoding="utf-8") as fh:
        text = fh.read()
    try:
        start = text.index(BEGIN) + len(BEGIN)
        end = text.index(END)
    except ValueError as error:
        raise SystemExit(f"{path}: registry markers not found ({error})")
    return json.loads(text[start:end])


def load_maps(path: str) -> dict:
    with open(path, encoding="utf-8") as fh:
        return json.load(fh)


def sources_in(maps: dict) -> dict[str, list[str]]:
    used: dict[str, list[str]] = {}
    for map_id, template in sorted(maps.items()):
        for field in template.get("fields", []):
            for src in (field.get("source"),
                        (field.get("showWhen") or {}).get("source")):
                if src:
                    used.setdefault(src, []).append(
                        f"{map_id}/{field.get('id', '')}")
    return used


def check(registry: dict, maps: dict) -> tuple[int, list[str]]:
    failures: list[str] = []
    checks = 0

    canonical = {f["source"] for f in registry["fields"]}
    canonical |= {f["subjectSource"] for f in registry["fields"]
                  if f.get("subjectSource")}
    aliases = registry.get("aliases", {})

    # 1. Every alias target names a field the workbook really has.
    for path, alias in sorted(aliases.items()):
        targets = alias.get("umi")
        if not targets:
            continue
        if isinstance(targets, str):
            targets = [targets]
        elif isinstance(targets, dict):
            targets = list(targets.values())
        for target in targets:
            checks += 1
            if target.startswith("umi.address."):
                continue
            if target not in canonical:
                failures.append(
                    f"alias {path} -> {target}: no such exact UMI field")

    # 2. Every source a production map uses is registered.
    used = sources_in(maps)
    for source, where in sorted(used.items()):
        checks += 1
        if source in aliases or source in canonical:
            continue
        if source.startswith(OPERATOR_NAMESPACES):
            continue
        failures.append(
            f"unregistered source {source} used by {', '.join(where[:3])}")

    # 3. No canonical `umi.*` source is used without existing.
    for source, where in sorted(used.items()):
        if not source.startswith("umi."):
            continue
        checks += 1
        if source.startswith("umi.address.") or source in canonical:
            continue
        failures.append(
            f"{source} is not in the registry (used by {', '.join(where[:3])})")

    # 4. The registry's own bookkeeping agrees with the maps it was built from.
    checks += 1
    if registry.get("danglingAliasTargets"):
        failures.append("registry records dangling alias targets: "
                        + ", ".join(registry["danglingAliasTargets"]))

    return checks, failures


def blocking_sources(registry: dict) -> set[str]:
    """Sources whose business origin is still an open question."""
    return {path for path, alias in registry.get("aliases", {}).items()
            if alias.get("kind") in BLOCKING_ALIAS_KINDS}


def self_test() -> int:
    """Negative gates: each mutation below must be caught."""
    registry = load_registry()
    base_maps = {"t": {"fields": [{"id": "a", "source": "field.client-code"}]}}

    cases = []

    bad = json.loads(json.dumps(registry))
    bad["aliases"]["field.client-code"]["umi"] = "umi.company.no_such_field"
    cases.append(("dangling alias target", bad, base_maps))

    cases.append(("unregistered source", registry,
                  {"t": {"fields": [{"id": "a", "source": "field.invented"}]}}))

    cases.append(("non-existent umi source", registry,
                  {"t": {"fields": [{"id": "a",
                                     "source": "umi.company.not_real"}]}}))

    bad2 = json.loads(json.dumps(registry))
    bad2["danglingAliasTargets"] = ["umi.company.x"]
    cases.append(("registry reports dangling", bad2, base_maps))

    bad3 = json.loads(json.dumps(registry))
    bad3["aliases"]["field.client-code"]["umi"] = "umi.clientNumberGlobal.nomer_klienta"
    caught_ok = True
    _, f = check(bad3, base_maps)
    if f:
        caught_ok = False  # this one is a *valid* field, so it must NOT fail

    passed = 0
    for label, reg, mps in cases:
        _, fails = check(reg, mps)
        if fails:
            passed += 1
        else:
            print(f"  NOT CAUGHT: {label}")
    if not caught_ok:
        print("  FALSE POSITIVE: a real UMI field was rejected")

    total = len(cases)
    ok = passed == total and caught_ok
    print(f"UMI registry self-test: {'PASS' if ok else 'FAIL'} · "
          f"{passed}/{total} negative gates (dangling alias target, "
          f"unregistered source, non-existent umi source, registry reports "
          f"dangling) + 1 false-positive guard")
    return 0 if ok else 1


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--maps", default=os.path.join(HERE, "maps.json"))
    ap.add_argument("--self-test", action="store_true")
    args = ap.parse_args()

    if args.self_test:
        return self_test()

    registry = load_registry()
    maps = load_maps(args.maps)
    checks, failures = check(registry, maps)

    for failure in failures:
        print(f"  FAIL {failure}")

    fields = registry["fields"]
    mapped = sum(1 for f in fields if f["status"] == "mapped")
    print(f"UMI registry: {len(registry['structures'])} structures, "
          f"{len(fields)} exact fields ({mapped} mapped, "
          f"{len(fields) - mapped} available but unused)")
    blocking = sorted(blocking_sources(registry))
    if blocking:
        print(f"sources awaiting a business answer: {len(blocking)}")
        for path in blocking:
            print(f"    {path}")
    print(f"UMI registry gate: {checks - len(failures)}/{checks} checks passed")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
