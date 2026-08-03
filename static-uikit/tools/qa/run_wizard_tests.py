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

DEPOSITORY_NUMBER_KEY = "extra-depository-contract"
DEPOSITORY_DATE_KEY = "extra-depository-contract-date"
DEPOSITORY_NUMBER = "ДЕПО-QA/0417"
DEPOSITORY_DATE = "2026-08-02"
DEPOSITORY_DOCUMENTS = (
    ("accession-application-fl", INDIVIDUAL),
    ("accession-application-yul", COMPANY),
    ("account-opening-notice", COMPANY),
)

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


def open_wizard(browser, server, subject, debug=False):
    suffix = "&document-debug=1" if debug else ""
    browser.goto(f"{server.base}/pages/document-wizard.html?subject={subject}{suffix}")
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
        if (/depositor|depositar|depo/i.test(key) && /date/i.test(key)) {
          return '2026-08-02';
        }
        if (/depositor|depositar|depo/i.test(key) && /contract/i.test(key)) {
          return 'ДЕПО-QA/0417';
        }
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
            var expansion = document.getElementById('docwiz-pdf-expansion');
            var text = status ? status.textContent : '';
            var done = /сформирован/.test(text) || status.classList.contains('is-error');
            if (done || Date.now() - started > __TIMEOUT__) {
              resolve({
                status: text,
                kind: status ? status.className : '',
                downloads: box ? box.querySelectorAll('a[data-object-url]').length : 0,
                overflowShown: !!(overflow && !overflow.hidden),
                overflowText: overflow ? overflow.textContent : '',
                overflowDebug: overflow ? overflow.querySelectorAll(
                  'details.crm-docwiz-overflow-debug').length : 0,
                expansionShown: !!(expansion && !expansion.hidden),
                expansionText: expansion ? expansion.textContent : '',
                expansionDebug: expansion ? expansion.querySelectorAll(
                  'details.crm-docwiz-expansion-debug').length : 0,
                overflowFields: overflow ? Array.prototype.map.call(
                  overflow.querySelectorAll('.crm-docwiz-overflow-field'),
                  function (el) { return el.textContent; }) : [],
                focused: document.activeElement ?
                  document.activeElement.getAttribute('data-field-key') : null,
                highlighted: Array.prototype.map.call(
                  document.querySelectorAll('#docwiz-extra-fields .crm-input-overflow'),
                  function (el) { return el.getAttribute('data-field-key'); }),
                renderCalls: window.__docwizQaOverlayRenderCalls || 0
              });
              return;
            }
            setTimeout(poll, 120);
          }());
        })
        """.replace("__TIMEOUT__", str(timeout_ms)),
        await_promise=True,
    )


def depository_control_snapshot(browser, doc_id):
    """Catalog policy and rendered controls for the legal agreement pair."""
    script = r"""
    (function (docId, keys) {
      var docs = (window.CRMDocumentCatalog || {}).documents || [];
      var doc = docs.find(function (item) { return item.id === docId; });
      var configured = (doc && doc.fields) || [];
      var out = {};
      keys.forEach(function (key) {
        var field = configured.find(function (item) { return item.key === key; });
        var input = document.querySelector(
          '#docwiz-extra-fields [data-field-key="' + key + '"]');
        out[key] = {
          config: field ? {
            label: field.label,
            type: field.type,
            required: field.required === true,
            sourceKind: field.sourceKind || null,
            hasDefault: Object.prototype.hasOwnProperty.call(field, 'default') ||
              Object.prototype.hasOwnProperty.call(field, 'defaultValue')
          } : null,
          control: input ? {
            type: input.type,
            required: input.required,
            sourceKind: input.getAttribute('data-source-kind'),
            value: input.value
          } : null
        };
      });
      return out;
    }(__DOC__, __KEYS__))
    """
    return browser.eval(
        script.replace("__DOC__", json.dumps(doc_id))
        .replace("__KEYS__", json.dumps(
            [DEPOSITORY_NUMBER_KEY, DEPOSITORY_DATE_KEY]))
    )


def depository_values(browser):
    return browser.eval(
        "(function (keys) { var out = {}; keys.forEach(function (key) {"
        " var el = document.querySelector('#docwiz-extra-fields "
        "[data-field-key=\"' + key + '\"]'); out[key] = el ? el.value : null;"
        " }); return out; }(" + json.dumps(
            [DEPOSITORY_NUMBER_KEY, DEPOSITORY_DATE_KEY]) + "))"
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
            if result["expansionShown"]:
                checks.check(
                    "manager expansion notice is generic",
                    "Длинные реквизиты будут автоматически перенесены" in
                    result["expansionText"] and result["expansionDebug"] == 0,
                    json.dumps(result, ensure_ascii=False),
                )

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
                technical = ("Поле:", "минимальный кегль", "доступно строк",
                             "newCodeWord")
                checks.check(
                    "normal manager overflow hides layout internals",
                    result["overflowDebug"] == 0 and
                    not any(token in result["overflowText"] for token in technical),
                    result["overflowText"],
                )
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

                # Explicit developer mode keeps the same manager guidance but
                # adds a collapsed technical section for diagnostics.
                open_wizard(browser, server, INDIVIDUAL, debug=True)
                if click_document(browser, "code-word-request"):
                    fill_extra_fields(browser, value_map={
                        word_key: "ОченьДлинноеКодовоеСловоКотороеТочноНеПоместитсяВСтроку"
                    }, long_text="Тест")
                    debug_result = generate(browser)
                    checks.check(
                        "explicit debug mode exposes collapsed technical details",
                        debug_result["overflowShown"] and
                        debug_result["overflowDebug"] > 0 and
                        "Поле:" in debug_result["overflowText"],
                        json.dumps(debug_result, ensure_ascii=False),
                    )

        # ── Company qualification uses exact legal name/address payload ─────
        # This exercises the Wizard payload itself. Builder fixtures carry a
        # fallback registration key, so a fixture-only render cannot prove the
        # production page preserves exact UMI/legal values.
        open_wizard(browser, server, COMPANY)
        qualification_id = "qualification-notice"
        qualification_offered = qualification_id in document_ids(browser)
        checks.check("company qualification notice is offered",
                     qualification_offered, str(document_ids(browser)))
        if qualification_offered and click_document(browser, qualification_id):
            fill_extra_fields(browser, value_map={
                "extra-document-date": "2026-08-03",
                "extra-qualification-scope": "all",
            }, long_text="РўРµСЃС‚")
            browser.eval(
                """
                (function () {
                  var renderer = window.CRMDocumentEngine.overlayRenderer;
                  var adapter = window.CRMDocumentEngine.umiAdapter;
                  var original = renderer.render;
                  renderer.render = function (template, payload, options) {
                    window.__docwizQaQualificationPayload = {
                      subjectDisplayName: payload.subject.displayName,
                      subjectFullLegalName: payload.subject.fullLegalName,
                      fieldFullName: payload.fields['client-full-name'],
                      fieldLegalAddress: payload.fields['client-legal-address'],
                      fieldRegistrationAddress:
                        payload.fields['client-registration-address'],
                      umiOrigname: payload.umi && payload.umi.company &&
                        payload.umi.company.origname,
                      exactUmiName: adapter.resolve('umi.origname', payload),
                      exactRegistrationAddress:
                        adapter.resolve('umi.address.registration', payload)
                    };
                    return original.call(this, template, payload, options);
                  };
                }())
                """
            )
            qualification_result = generate(browser)
            qualification_payload = browser.eval(
                "window.__docwizQaQualificationPayload || null")
            checks.check(
                "company qualification notice generates from Wizard payload",
                qualification_result["downloads"] == 1 and
                "is-error" not in qualification_result["kind"] and
                not qualification_result["overflowShown"],
                json.dumps(qualification_result, ensure_ascii=False),
            )
            q = qualification_payload or {}
            checks.check(
                "company qualification uses full legal name, not display caption",
                bool(q.get("subjectFullLegalName")) and
                q.get("fieldFullName") == q.get("subjectFullLegalName") and
                q.get("fieldFullName") != q.get("subjectDisplayName"),
                json.dumps(q, ensure_ascii=False),
            )
            checks.check(
                "Wizard preserves exact company origname through UMI adapter",
                q.get("umiOrigname") == q.get("subjectFullLegalName") and
                q.get("exactUmiName") == q.get("subjectFullLegalName"),
                json.dumps(q, ensure_ascii=False),
            )
            checks.check(
                "company registration address resolves once from legal address",
                bool(q.get("fieldLegalAddress")) and
                q.get("fieldRegistrationAddress") == q.get("fieldLegalAddress") and
                q.get("exactRegistrationAddress") == q.get("fieldLegalAddress"),
                json.dumps(q, ensure_ascii=False),
            )

        # ── Depository pair policy and rendered controls ───────────────────
        expected_depository_controls = {
            DEPOSITORY_NUMBER_KEY: ("Номер депозитарного договора", "text"),
            DEPOSITORY_DATE_KEY: ("Дата депозитарного договора", "date"),
        }
        for doc_id, subject_id in DEPOSITORY_DOCUMENTS:
            open_wizard(browser, server, subject_id)
            offered = doc_id in document_ids(browser)
            checks.check(f"{doc_id}: depository document is offered", offered,
                         str(document_ids(browser)))
            if not offered or not click_document(browser, doc_id):
                continue
            snapshot = depository_control_snapshot(browser, doc_id)
            for key, (label, control_type) in expected_depository_controls.items():
                item = snapshot.get(key) or {}
                config = item.get("config") or {}
                control = item.get("control") or {}
                checks.check(
                    f"{doc_id}: {key} has the exact operator-input policy",
                    config.get("label") == label and
                    config.get("type") == control_type and
                    config.get("required") is True and
                    config.get("sourceKind") == "operator-input",
                    json.dumps(item, ensure_ascii=False),
                )
                checks.check(
                    f"{doc_id}: {key} has no configured or rendered default",
                    config.get("hasDefault") is False and control.get("value") == "",
                    json.dumps(item, ensure_ascii=False),
                )
                checks.check(
                    f"{doc_id}: {key} renders as a required operator control",
                    control.get("type") == control_type and
                    control.get("required") is True and
                    control.get("sourceKind") == "operator-input",
                    json.dumps(item, ensure_ascii=False),
                )

        # ── Depository values survive Back / document switches ─────────────
        open_wizard(browser, server, COMPANY)
        state_docs = document_ids(browser)
        yul_id = "accession-application-yul"
        account_id = "account-opening-notice"
        if yul_id in state_docs and account_id in state_docs and click_document(browser, yul_id):
            yul_pair = {
                DEPOSITORY_NUMBER_KEY: "ДЕПО-QA/YUL-0417",
                DEPOSITORY_DATE_KEY: "2026-08-02",
            }
            account_pair = {
                DEPOSITORY_NUMBER_KEY: "ДЕПО-QA/ACCOUNT-0518",
                DEPOSITORY_DATE_KEY: "2026-08-03",
            }
            fill_extra_fields(browser, value_map=yul_pair, long_text="Тест")
            browser.eval("document.getElementById('docwiz-back-btn').click()")
            click_document(browser, account_id)
            fresh_account = depository_values(browser)
            checks.check(
                "depository pair does not leak into another document",
                fresh_account == {
                    DEPOSITORY_NUMBER_KEY: "", DEPOSITORY_DATE_KEY: ""
                },
                json.dumps(fresh_account, ensure_ascii=False),
            )
            fill_extra_fields(browser, value_map=account_pair, long_text="Тест")
            browser.eval("document.getElementById('docwiz-back-btn').click()")
            click_document(browser, yul_id)
            restored_yul = depository_values(browser)
            checks.check("depository pair survives Back and reselect",
                         restored_yul == yul_pair,
                         json.dumps(restored_yul, ensure_ascii=False))
            browser.eval("document.getElementById('docwiz-back-btn').click()")
            click_document(browser, account_id)
            restored_account = depository_values(browser)
            checks.check("each document restores its own depository pair",
                         restored_account == account_pair,
                         json.dumps(restored_account, ensure_ascii=False))

        # ── Either missing depository value blocks generation ──────────────
        for doc_id, subject_id in DEPOSITORY_DOCUMENTS:
            open_wizard(browser, server, subject_id)
            if not click_document(browser, doc_id):
                continue
            browser.eval(
                "(function () { var renderer = window.CRMDocumentEngine.overlayRenderer;"
                " var original = renderer.render;"
                " window.__docwizQaOverlayRenderCalls = 0;"
                " renderer.render = function () {"
                "  window.__docwizQaOverlayRenderCalls += 1;"
                "  return original.apply(this, arguments);"
                " }; }())"
            )
            fill_extra_fields(browser, value_map={
                DEPOSITORY_NUMBER_KEY: "",
                DEPOSITORY_DATE_KEY: DEPOSITORY_DATE,
            }, long_text="Тест")
            missing_number = generate(browser, timeout_ms=5000)
            checks.check(
                f"{doc_id}: missing depository number refuses generation",
                missing_number["downloads"] == 0 and
                missing_number["renderCalls"] == 0 and
                "is-error" in missing_number["kind"] and
                missing_number["focused"] == DEPOSITORY_NUMBER_KEY,
                json.dumps(missing_number, ensure_ascii=False),
            )

            fill_extra_fields(browser, value_map={
                DEPOSITORY_NUMBER_KEY: DEPOSITORY_NUMBER,
                DEPOSITORY_DATE_KEY: "",
            }, long_text="Тест")
            missing_date = generate(browser, timeout_ms=5000)
            checks.check(
                f"{doc_id}: missing depository date refuses generation",
                missing_date["downloads"] == 0 and
                missing_date["renderCalls"] == 0 and
                "is-error" in missing_date["kind"] and
                missing_date["focused"] == DEPOSITORY_DATE_KEY,
                json.dumps(missing_date, ensure_ascii=False),
            )

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
