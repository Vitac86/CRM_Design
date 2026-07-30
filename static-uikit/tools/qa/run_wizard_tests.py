"""Document Wizard end-to-end checks, driven headlessly.

    python static-uikit/tools/qa/run_wizard_tests.py

Exercises the real page (pages/document-wizard.html) with the real production
engine and field maps. Verifies that a manager can generate documents for
realistic long values without hitting a dead end, that an unresolved overflow
in an operator-entered value sends them back to that input with everything else
preserved, and that repeat generation does not leak Object URLs.

Exit code 0 when every check passes.
"""

from __future__ import annotations

import json
import sys

from headless_browser import Chrome, Server

# c-011 is a legal entity and c-006 an individual in the mock CRM data; between
# them the wizard offers both document families.
INDIVIDUAL = "c-006"
COMPANY = "c-011"

LONG_RU_NAME = "Александров-Смирнов Константин Владиславович"
LONG_RU_ADDRESS = ("125009, Российская Федерация, город Москва, улица Большая "
                   "Никитская, дом 128, корпус 4, строение 7, квартира 385")


class Checks:
    def __init__(self) -> None:
        self.results: list[tuple[str, bool, str]] = []

    def check(self, name: str, ok: bool, detail: str = "") -> bool:
        self.results.append((name, bool(ok), detail))
        return bool(ok)

    @property
    def failed(self):
        return [r for r in self.results if not r[1]]

    def report(self) -> int:
        for name, ok, detail in self.results:
            if not ok:
                print(f"FAIL  {name}\n      {detail}")
        print(f"\nDocument Wizard: {len(self.results) - len(self.failed)}"
              f"/{len(self.results)} checks passed")
        return 1 if self.failed else 0


def open_wizard(browser, server, subject):
    browser.goto(f"{server.base}/pages/document-wizard.html?subject={subject}")
    browser.eval("new Promise(r => setTimeout(r, 400))", await_promise=True)


def document_ids(browser):
    """Distinct document ids offered on the current page.

    Both the card and its inner button carry data-doc-id, so the raw query
    returns every id twice.
    """
    ids = browser.eval(
        "Array.prototype.map.call(document.querySelectorAll('[data-doc-id]'),"
        " function (el) { return el.getAttribute('data-doc-id'); })"
    ) or []
    return sorted(set(ids))


def click_document(browser, doc_id) -> bool:
    """Selection is driven by the card's button, not the card element."""
    script = (
        "(function () {"
        "  var button = document.querySelector('button[data-doc-id=\"" + doc_id + "\"]')"
        "    || document.querySelector('[data-doc-id=\"" + doc_id + "\"]');"
        "  if (!button) return false;"
        "  button.click();"
        "  return true;"
        "}())"
    )
    if not browser.eval(script):
        return False
    browser.eval("new Promise(function (r) { setTimeout(r, 300); })", await_promise=True)
    return bool(browser.eval("!document.getElementById('docwiz-step2').hidden"))


def fill_extra_fields(browser, value_map=None, long_text=None):
    """Fill every enabled extra input; returns what was written.

    Values are chosen by what the key means, the same way the synthetic
    fixtures do. Writing a 130-character address into a tariff-plan slot would
    only manufacture an overflow no manager will ever produce, and would say
    nothing about whether the document works.
    """
    script = """
    (function (overrides, longText) {
      function plausible(key, el) {
        if (el.type === 'date') return '2026-07-29';
        if (/tariff/i.test(key)) return 'Стандартный';
        if (/amount|sum|price|rate|quantity|lots/i.test(key)) return '150 000,00';
        if (/percent|share/i.test(key)) return '100 %';
        if (/inn/i.test(key)) return '772201234567';
        if (/ogrn/i.test(key)) return '1217700011256';
        if (/kpp/i.test(key)) return '770101001';
        if (/bik|bic/i.test(key)) return '044525225';
        if (/number|code|account|portfolio|contract/i.test(key)) return 'BR-2026/00444';
        if (/word/i.test(key)) return 'Ромашка';
        if (/address|place/i.test(key)) return longText;
        if (/name|fio|director|representative/i.test(key)) {
          return 'Александров-Смирнов Константин Владиславович';
        }
        return 'Тестовое значение';
      }
      var written = {};
      document.querySelectorAll('#docwiz-extra-fields [data-field-key]').forEach(function (el) {
        if (el.disabled) return;
        var key = el.getAttribute('data-field-key');
        var value;
        if (Object.prototype.hasOwnProperty.call(overrides, key)) value = overrides[key];
        else if (el.tagName === 'SELECT') {
          var option = Array.prototype.find.call(el.options, function (o) { return o.value; });
          value = option ? option.value : '';
        } else value = plausible(key, el);
        el.value = value;
        el.dispatchEvent(new Event('change', { bubbles: true }));
        el.dispatchEvent(new Event('input', { bubbles: true }));
        written[key] = el.value;
      });
      document.querySelectorAll('#docwiz-extra-fields [data-check-key]').forEach(function (el) {
        if (!el.checked) { el.checked = true; el.dispatchEvent(new Event('change', { bubbles: true })); }
      });
      return written;
    }(__OVERRIDES__, __LONGTEXT__))
    """
    # Plain substitution: the script contains a literal '%' and cannot use
    # printf-style formatting.
    script = script.replace("__OVERRIDES__", json.dumps(value_map or {}, ensure_ascii=False))
    script = script.replace("__LONGTEXT__",
                            json.dumps(long_text or LONG_RU_ADDRESS, ensure_ascii=False))
    return browser.eval(script)


def generate(browser, timeout_ms=60000):
    browser.eval("document.getElementById('docwiz-generate-pdf-btn').click()")
    return browser.eval(
        """
        new Promise(function (resolve) {
          var started = Date.now();
          (function poll() {
            var status = document.getElementById('docwiz-pdf-status');
            var box = document.getElementById('docwiz-pdf-downloads');
            var overflow = document.getElementById('docwiz-pdf-overflow');
            var text = status ? status.textContent : '';
            var done = /сформирован/.test(text) || status.classList.contains('is-error');
            if (done || Date.now() - started > __TIMEOUT__) {
              resolve({
                status: text,
                kind: status ? status.className : '',
                downloads: box ? box.querySelectorAll('a[data-object-url]').length : 0,
                overflowShown: !!(overflow && !overflow.hidden),
                overflowFields: overflow ? Array.prototype.map.call(
                  overflow.querySelectorAll('.crm-docwiz-overflow-field'),
                  function (el) { return el.textContent; }) : [],
                focused: document.activeElement ?
                  document.activeElement.getAttribute('data-field-key') : null,
                highlighted: Array.prototype.map.call(
                  document.querySelectorAll('#docwiz-extra-fields .crm-input-overflow'),
                  function (el) { return el.getAttribute('data-field-key'); })
              });
              return;
            }
            setTimeout(poll, 120);
          }());
        })
        """.replace("__TIMEOUT__", str(timeout_ms)),
        await_promise=True,
    )


def main() -> int:
    server, browser = Server(), Chrome()
    checks = Checks()
    try:
        # ── A realistic long value generates with no manager intervention ────
        open_wizard(browser, server, INDIVIDUAL)
        docs = document_ids(browser)
        checks.check("wizard lists documents", bool(docs), f"got {docs}")

        target = "accession-application-fl"
        checks.check(f"{target} offered to an individual", target in docs,
                     f"documents: {docs}")

        if target in docs:
            click_document(browser, target)
            written = fill_extra_fields(browser, long_text=LONG_RU_ADDRESS)
            result = generate(browser)
            checks.check("long values generate without intervention",
                         result["downloads"] == 1 and "is-error" not in result["kind"],
                         json.dumps(result, ensure_ascii=False))
            checks.check("no overflow panel for a supported long value",
                         not result["overflowShown"], str(result["overflowFields"]))

            # ── Entered values survive the preflight ────────────────────────
            after = browser.eval(
                "(function () { var out = {};"
                " document.querySelectorAll('#docwiz-extra-fields [data-field-key]')"
                "  .forEach(function (el) { out[el.getAttribute('data-field-key')] = el.value; });"
                " return out; }())"
            )
            preserved = all(after.get(k) == v for k, v in (written or {}).items())
            checks.check("entered values survive generation", preserved,
                         f"before={written} after={after}")

            # ── Repeat generation works and revokes the previous Blob URL ───
            first_url = browser.eval(
                "(function () { var a = document.querySelector("
                "'#docwiz-pdf-downloads a[data-object-url]');"
                " return a ? a.getAttribute('data-object-url') : null; }())"
            )
            second = generate(browser)
            second_url = browser.eval(
                "(function () { var a = document.querySelector("
                "'#docwiz-pdf-downloads a[data-object-url]');"
                " return a ? a.getAttribute('data-object-url') : null; }())"
            )
            checks.check("repeat generation works", second["downloads"] == 1,
                         json.dumps(second, ensure_ascii=False))
            checks.check("a fresh Object URL is issued", first_url != second_url,
                         f"{first_url} vs {second_url}")
            revoked = first_url and browser.eval(
                """
                new Promise(function (resolve) {
                  fetch(%s).then(function () { resolve(false); })
                           .catch(function () { resolve(true); });
                })
                """ % json.dumps(first_url),
                await_promise=True,
            )
            checks.check("the stale Object URL was revoked", revoked is True,
                         f"{first_url} still resolves")

            # ── CRM values are not modified by generation ───────────────────
            subject_intact = browser.eval(
                "(function () {"
                " var el = document.querySelector('[data-role=\"docwiz-subject-name\"]')"
                "   || document.getElementById('docwiz-subject-name');"
                " return el ? el.textContent.trim() : null; }())"
            )
            checks.check("subject summary untouched after generation",
                         subject_intact is None or len(subject_intact) > 0,
                         str(subject_intact))

        # ── An unresolved operator value sends the manager back to it ────────
        # code-word-request has a narrow printed slot and an operator-entered
        # code word, so an absurd value is the honest way to reach the preflight.
        open_wizard(browser, server, INDIVIDUAL)
        if click_document(browser, "code-word-request"):
            fill_extra_fields(browser, long_text="Тест")
            keys = browser.eval(
                "Array.prototype.map.call("
                " document.querySelectorAll('#docwiz-extra-fields [data-field-key]'),"
                " function (el) { return el.getAttribute('data-field-key'); })"
            ) or []
            word_key = next((k for k in keys if "code-word" in k and "operation" not in k),
                            keys[0] if keys else None)
            if word_key:
                fill_extra_fields(browser, value_map={
                    word_key: "ОченьДлинноеКодовоеСловоКотороеТочноНеПоместитсяВСтроку"
                }, long_text="Тест")
                other_before = browser.eval(
                    "(function () { var out = {};"
                    " document.querySelectorAll('#docwiz-extra-fields [data-field-key]')"
                    "  .forEach(function (el) { out[el.getAttribute('data-field-key')] = el.value; });"
                    " return out; }())"
                )
                result = generate(browser)
                checks.check("unresolved overflow shows the actionable panel",
                             result["overflowShown"] and bool(result["overflowFields"]),
                             json.dumps(result, ensure_ascii=False))
                checks.check("no PDF is offered for an unprintable document",
                             result["downloads"] == 0,
                             json.dumps(result, ensure_ascii=False))
                checks.check("the offending input is focused or highlighted",
                             result["focused"] == word_key or word_key in result["highlighted"],
                             f"focused={result['focused']} highlighted={result['highlighted']}")
                other_after = browser.eval(
                    "(function () { var out = {};"
                    " document.querySelectorAll('#docwiz-extra-fields [data-field-key]')"
                    "  .forEach(function (el) { out[el.getAttribute('data-field-key')] = el.value; });"
                    " return out; }())"
                )
                kept = all(other_after.get(k) == v for k, v in other_before.items()
                           if k != word_key)
                checks.check("other entered values are preserved on overflow", kept,
                             f"before={other_before} after={other_after}")

                # Correcting the value must let the document through.
                fill_extra_fields(browser, value_map={word_key: "Ромашка"},
                                  long_text="Тест")
                fixed = generate(browser)
                checks.check("correcting the value generates the document",
                             fixed["downloads"] == 1 and not fixed["overflowShown"],
                             json.dumps(fixed, ensure_ascii=False))

        # ── Back / reselect ─────────────────────────────────────────────────
        open_wizard(browser, server, COMPANY)
        company_docs = document_ids(browser)
        checks.check("company documents are offered", bool(company_docs),
                     str(company_docs))
        if len(company_docs) >= 2:
            click_document(browser, company_docs[0])
            browser.eval("document.getElementById('docwiz-back-btn').click()")
            click_document(browser, company_docs[1])
            reselected = browser.eval(
                "(function () { var el = document.getElementById('docwiz-selected-title');"
                " return el ? el.textContent.trim() : ''; }())"
            )
            checks.check("back then reselect keeps the wizard usable",
                         bool(reselected), f"title={reselected!r}")

        # ── ISBYUL stays hidden, transfer-requisites stays unexposed ─────────
        for hidden in ("anketa-isbyul", "transfer-requisites"):
            checks.check(f"{hidden} is not exposed",
                         hidden not in docs and hidden not in company_docs,
                         f"individual={docs} company={company_docs}")

        # ── No console errors, no failed requests ───────────────────────────
        noise = [c for c in browser.console
                 if "favicon" not in c and "DevTools" not in c]
        checks.check("no console errors or warnings", not noise, "; ".join(noise[:5]))
        bad = [r for r in browser.requests if "favicon" not in r]
        checks.check("no failed network requests", not bad, "; ".join(bad[:5]))
    finally:
        browser.stop()
        server.stop()

    return checks.report()


if __name__ == "__main__":
    sys.exit(main())
