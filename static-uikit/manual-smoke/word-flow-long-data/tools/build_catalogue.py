"""Build index.html and smoke-checklist.md from the generated manifest.

    python build_catalogue.py

The page is fully self-contained: no CDN, no external font, no network call of
any kind, and nothing is ever uploaded. Review state lives in this browser's
localStorage and can be exported to a CSV file on this machine.
"""

from __future__ import annotations

import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)

CHECKLIST = [
    ("font", "Шрифт совпадает с исходным документом"),
    ("size", "Кегль визуально одинаков со шрифтом формы"),
    ("floor", "Ни одно клиентское значение не мельче 9 pt"),
    ("wrap", "Слова переносятся естественно, без разрывов внутри слова"),
    ("company-label", "Наименование организации не оторвано от своей подписи"),
    ("name-label", "ФИО не оторвано от своей подписи"),
    ("tokens", "ОГРН и ИНН не разорваны переносом"),
    ("punctuation", "Пунктуация корректна"),
    ("slash", "Нет лишней косой черты или обратного слеша"),
    ("duplicate", "Нет продублированных значений"),
    ("missing", "Нет пропущенных значений"),
    ("underline", "Подчёркивания на месте и нужной длины"),
    ("stray-rule", "Не появилось неиспользуемой лишней линейки"),
    ("below", "Текст ниже сместился естественно"),
    ("overlap", "Нет наложения текста"),
    ("clip", "Нет обрезанного текста"),
    ("table", "Границы таблиц остались выровненными"),
    ("headers", "Колонтитулы и номера страниц на месте"),
    ("signature", "Блоки подписи и «для служебных отметок» не изменились"),
    ("pages", "Число страниц не изменилось"),
    ("crosspage", "Межстраничное продолжение читается естественно"),
]

CSS = """
:root{--ink:#12161c;--muted:#5b6675;--line:#d9dee6;--bg:#f6f7f9;--card:#fff;
--pri:#0b4fa8;--ok:#116b3a;--warn:#8a5a00;--bad:#a11b1b;--chip:#eef1f6}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);
font:14px/1.5 "Segoe UI",Tahoma,Verdana,sans-serif}
header{background:var(--card);border-bottom:1px solid var(--line);
padding:18px 24px;position:sticky;top:0;z-index:5}
h1{margin:0 0 4px;font-size:20px}
.sub{color:var(--muted);font-size:13px}
main{padding:20px 24px 60px;max-width:1500px;margin:0 auto}
section{margin-bottom:26px}
h2{font-size:16px;margin:0 0 10px;padding-bottom:6px;border-bottom:1px solid var(--line)}
.tiles{display:flex;flex-wrap:wrap;gap:10px}
.tile{background:var(--card);border:1px solid var(--line);border-radius:8px;
padding:10px 14px;min-width:130px}
.tile b{display:block;font-size:22px;line-height:1.2}
.tile span{color:var(--muted);font-size:12px}
.filters{background:var(--card);border:1px solid var(--line);border-radius:8px;
padding:12px 14px;display:flex;flex-wrap:wrap;gap:12px;align-items:flex-end}
.filters label{display:flex;flex-direction:column;gap:4px;font-size:12px;
color:var(--muted)}
select,input[type=search]{font:inherit;padding:5px 8px;border:1px solid var(--line);
border-radius:6px;background:#fff;min-width:180px}
button{font:inherit;padding:6px 12px;border:1px solid var(--line);border-radius:6px;
background:#fff;cursor:pointer}
button:hover{background:var(--chip)}
button.primary{background:var(--pri);color:#fff;border-color:var(--pri)}
button.primary:hover{filter:brightness(1.1)}
.card{background:var(--card);border:1px solid var(--line);border-radius:8px;
padding:14px 16px;margin-bottom:10px}
.card.pri{border-left:4px solid var(--pri)}
.card.stress{border-left:4px solid var(--warn);background:#fffdf6}
.row1{display:flex;flex-wrap:wrap;gap:10px;align-items:baseline}
.seq{font-variant-numeric:tabular-nums;color:var(--muted);font-size:12px}
.name{font-weight:600}
.chips{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0}
.chip{background:var(--chip);border-radius:999px;padding:2px 9px;font-size:12px;
color:var(--muted)}
.chip.pri{background:#e5efff;color:var(--pri);font-weight:600}
.chip.ok{background:#e6f4ec;color:var(--ok)}
.chip.bad{background:#fdeaea;color:var(--bad)}
.chip.flow{background:#efe7fb;color:#5b2ea6}
.acts{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-top:8px}
a.btn{display:inline-block;padding:6px 12px;border-radius:6px;text-decoration:none;
background:var(--pri);color:#fff;font-weight:600}
a.btn:hover{filter:brightness(1.1)}
a.lnk{color:var(--pri)}
textarea{width:100%;min-height:52px;font:inherit;padding:6px 8px;
border:1px solid var(--line);border-radius:6px;resize:vertical;margin-top:8px}
details{margin-top:8px}
summary{cursor:pointer;color:var(--muted);font-size:13px}
ul.check{list-style:none;margin:8px 0 0;padding:0;columns:2;column-gap:26px}
ul.check li{margin:0 0 4px;break-inside:avoid}
ul.check label{display:flex;gap:7px;align-items:flex-start;font-size:13px}
.note{color:var(--muted);font-size:13px;margin:6px 0 0}
.shots{display:flex;flex-wrap:wrap;gap:14px}
.shot{background:var(--card);border:1px solid var(--line);border-radius:8px;
padding:10px;width:340px}
.shot img{width:100%;border:1px solid var(--line);border-radius:4px;display:block}
.shot h3{font-size:13px;margin:8px 0 4px}
.warnbox{background:#fffaf0;border:1px solid #f0d9a8;border-radius:8px;
padding:12px 14px;margin-bottom:10px}
.warnbox h3{margin:0 0 6px;font-size:14px;color:var(--warn)}
code{background:var(--chip);padding:1px 5px;border-radius:4px;font-size:12px}
.hidden{display:none!important}
"""

JS = r"""
var KEY = 'crm-smoke-word-flow-long-data-v1';
var state = {};
try { state = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { state = {}; }

function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
  paint();
}
function entry(id) {
  if (!state[id]) state[id] = { status: 'not-reviewed', notes: '', checks: {} };
  return state[id];
}
function paint() {
  var counts = { 'not-reviewed': 0, passed: 0, defect: 0, discuss: 0 };
  document.querySelectorAll('.card[data-id]').forEach(function (card) {
    var it = entry(card.dataset.id);
    counts[it.status] = (counts[it.status] || 0) + 1;
    var chip = card.querySelector('.status-chip');
    if (!chip) return;
    chip.textContent = LABEL[it.status];
    // Keep the hook class: rewriting className wholesale would drop
    // `status-chip` and the next repaint would find nothing to update.
    chip.className = 'status-chip chip ' +
      (it.status === 'passed' ? 'ok' : it.status === 'defect' ? 'bad' : '');
  });
  document.getElementById('c-reviewed').textContent =
    (counts.passed + counts.defect + counts.discuss);
  document.getElementById('c-passed').textContent = counts.passed;
  document.getElementById('c-defect').textContent = counts.defect;
}
var LABEL = { 'not-reviewed': 'Не проверено', passed: 'Проверено — ОК',
  defect: 'Найден дефект', discuss: 'Требует обсуждения' };

function apply() {
  var doc = document.getElementById('f-doc').value;
  var kind = document.getElementById('f-kind').value;
  var scen = document.getElementById('f-scen').value;
  var stat = document.getElementById('f-status').value;
  var pri = document.getElementById('f-pri').checked;
  var q = (document.getElementById('f-q').value || '').toLowerCase();
  var shown = 0;
  document.querySelectorAll('.card[data-id]').forEach(function (card) {
    var d = card.dataset;
    var it = entry(d.id);
    var ok = (!doc || d.doc === doc) && (!kind || d.kind === kind) &&
      (!scen || d.scen === scen) && (!stat || it.status === stat) &&
      (!pri || d.pri === '1') &&
      (!q || (d.search || '').indexOf(q) !== -1);
    card.classList.toggle('hidden', !ok);
    if (ok) shown += 1;
  });
  document.getElementById('c-shown').textContent = shown;
}

function exportCsv() {
  var rows = [['sequence', 'pdfFilename', 'documentTitle', 'subjectKind',
               'scenario', 'priority', 'reviewStatus', 'notes', 'uncheckedItems']];
  document.querySelectorAll('.card[data-id]').forEach(function (card) {
    var d = card.dataset, it = entry(d.id);
    var missed = [];
    card.querySelectorAll('input[data-check]').forEach(function (box) {
      if (!box.checked) missed.push(box.dataset.check);
    });
    rows.push([d.seq, d.id, d.title, d.kind, d.scen, d.pri === '1' ? 'PRIORITY' : '',
               it.status, (it.notes || '').replace(/[\r\n]+/g, ' '), missed.join(' ')]);
  });
  var csv = '﻿' + rows.map(function (r) {
    return r.map(function (c) { return '"' + String(c).replace(/"/g, '""') + '"'; })
      .join(';');
  }).join('\r\n');
  var blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'visual-review-filled.csv';
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
}

document.addEventListener('DOMContentLoaded', function () {
  document.querySelectorAll('.card[data-id]').forEach(function (card) {
    var id = card.dataset.id, it = entry(id);
    var sel = card.querySelector('select.status');
    sel.value = it.status;
    sel.addEventListener('change', function () { it.status = sel.value; save(); apply(); });
    var ta = card.querySelector('textarea');
    ta.value = it.notes || '';
    ta.addEventListener('input', function () { it.notes = ta.value; save(); });
    card.querySelectorAll('input[data-check]').forEach(function (box) {
      box.checked = !!it.checks[box.dataset.check];
      box.addEventListener('change', function () {
        it.checks[box.dataset.check] = box.checked; save();
      });
    });
  });
  ['f-doc', 'f-kind', 'f-scen', 'f-status', 'f-pri', 'f-q'].forEach(function (id) {
    var el = document.getElementById(id);
    el.addEventListener(el.tagName === 'INPUT' && el.type !== 'checkbox'
      ? 'input' : 'change', apply);
  });
  document.getElementById('b-export').addEventListener('click', exportCsv);
  document.getElementById('b-reset').addEventListener('click', function () {
    if (!confirm('Сбросить локальные отметки проверки?')) return;
    state = {}; save();
    document.querySelectorAll('.card[data-id] select.status').forEach(function (s) {
      s.value = 'not-reviewed';
    });
    document.querySelectorAll('.card[data-id] textarea').forEach(function (t) {
      t.value = '';
    });
    document.querySelectorAll('input[data-check]').forEach(function (b) {
      b.checked = false;
    });
    apply();
  });
  paint(); apply();
});
"""


def esc(value) -> str:
    return (str(value).replace("&", "&amp;").replace("<", "&lt;")
            .replace(">", "&gt;").replace('"', "&quot;"))


def build_html(manifest, structural, findings, shots, limits) -> str:
    items = [i for i in manifest["items"] if i["pdfFilename"]]
    refused = [i for i in manifest["items"] if not i["pdfFilename"]]
    by_status = {s["pdf"]: s for s in structural["results"]}

    docs = sorted({(i["documentId"], i["documentTitle"]) for i in items})
    scenarios = sorted({i["scenario"] for i in items})

    out = ["<!DOCTYPE html>", '<html lang="ru">', "<head>",
           '<meta charset="utf-8">',
           '<meta name="viewport" content="width=device-width, initial-scale=1">',
           "<title>Ручной смоук-тест — Word-flow, длинные данные</title>",
           # Inline 1×1 transparent GIF, so the page makes no request at all
           # beyond the files it links: an absent favicon would otherwise show
           # up as a 404. A GIF, not an SVG, because an inline SVG would carry
           # the w3.org namespace URI and look like an external reference.
           '<link rel="icon" href="data:image/gif;base64,'
           'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7">',
           f"<style>{CSS}</style>", "</head>", "<body>"]

    out += ["<header>",
            "<h1>Ручной смоук-тест генерации PDF — длинные данные Word-flow</h1>",
            '<div class="sub">Все данные синтетические. Все ссылки локальные. '
            "Ничего никуда не отправляется — отметки проверки хранятся только "
            "в localStorage этого браузера.</div>", "</header>", "<main>"]

    # ── Summary ──
    ok = sum(1 for i in items if i["structuralStatus"] == "PASS")
    priority = sum(1 for i in items if i["priority"])
    cross = sum(1 for i in items if i["crossPageRuleExercised"])
    out += ['<section><h2>Сводка</h2><div class="tiles">',
            f'<div class="tile"><b>{len(items)}</b><span>PDF сгенерировано</span></div>',
            f'<div class="tile"><b>{len(docs)}</b><span>документов</span></div>',
            f'<div class="tile"><b>{priority}</b><span>приоритетных</span></div>',
            f'<div class="tile"><b>{ok}/{len(items)}</b>'
            "<span>структурная проверка</span></div>",
            f'<div class="tile"><b>{cross}</b>'
            "<span>межстраничный перенос</span></div>",
            '<div class="tile"><b id="c-reviewed">0</b>'
            "<span>просмотрено вами</span></div>",
            '<div class="tile"><b id="c-passed">0</b><span>без замечаний</span></div>',
            '<div class="tile"><b id="c-defect">0</b><span>с дефектом</span></div>',
            "</div></section>"]

    # ── Findings ──
    live = [f for f in findings.get("findings", []) if f.get("reproduced")]
    if live:
        out.append("<section><h2>Найденные вопросы к продакшену</h2>")
        for finding in live:
            out += [f'<div class="warnbox"><h3>{esc(finding["title"])}</h3>',
                    f'<p class="note"><b>Документ:</b> <code>'
                    f'{esc(finding["documentId"])}</code> · <b>блок:</b> '
                    f'<code>{esc(finding.get("block", ""))}</code></p>',
                    f'<p class="note">{esc(finding["cause"])}</p>',
                    f'<p class="note"><b>Почему не исправлено здесь:</b> '
                    f'{esc(finding["notFixedBecause"])}</p>',
                    '<p class="note">Полные данные: '
                    '<a class="lnk" href="reports/production-findings.json">'
                    "reports/production-findings.json</a></p></div>"]
        out.append("</section>")

    # ── Filters ──
    doc_options = "".join(
        f'<option value="{esc(d)}">{esc(t)}</option>' for d, t in docs)
    scen_options = "".join(
        f'<option value="{esc(s)}">{esc(s)}</option>' for s in scenarios)
    out += ["<section><h2>Фильтры</h2>", '<div class="filters">',
            f'<label>Документ<select id="f-doc"><option value="">все</option>'
            f"{doc_options}</select></label>",
            '<label>Субъект<select id="f-kind"><option value="">все</option>'
            '<option value="individual">физическое лицо</option>'
            '<option value="company">юридическое лицо</option></select></label>',
            f'<label>Сценарий<select id="f-scen"><option value="">все</option>'
            f"{scen_options}</select></label>",
            '<label>Статус проверки<select id="f-status">'
            '<option value="">любой</option>'
            '<option value="not-reviewed">Не проверено</option>'
            '<option value="passed">Проверено — ОК</option>'
            '<option value="defect">Найден дефект</option>'
            '<option value="discuss">Требует обсуждения</option></select></label>',
            '<label>Поиск<input type="search" id="f-q" '
            'placeholder="имя файла, документ, профиль"></label>',
            '<label style="flex-direction:row;align-items:center;gap:6px">'
            '<input type="checkbox" id="f-pri"> только приоритетные</label>',
            '<button class="primary" id="b-export">Выгрузить отчёт CSV</button>',
            '<button id="b-reset">Сбросить отметки</button>',
            '<span class="note">показано: <b id="c-shown">0</b></span>',
            "</div></section>"]

    # ── Screenshots ──
    if shots.get("screenshots"):
        out.append("<section><h2>Куда смотреть — превью приоритетных мест</h2>"
                   '<div class="shots">')
        for shot in shots["screenshots"]:
            out += [f'<div class="shot">'
                    f'<img src="screenshots/{esc(shot["png"])}" alt="'
                    f'{esc(shot["title"])}" loading="lazy">'
                    f'<h3>{esc(shot["title"])}</h3>'
                    f'<p class="note">{esc(shot["whatToLookAt"])}</p>'
                    f'<p class="note">Из <a class="lnk" href="'
                    f'{esc(shot["pdfPath"])}" target="_blank" rel="noopener">'
                    f'{esc(shot["fromPdf"])}</a>, стр. {shot["page"]}</p></div>']
        out.append("</div></section>")

    # ── Cards ──
    out.append(f"<section><h2>Сгенерированные документы ({len(items)})</h2>")
    for item in items:
        verdict = by_status.get(item["pdfFilename"], {})
        classes = "card" + (" pri" if item["priority"] else "")
        search = " ".join([item["pdfFilename"], item["documentTitle"],
                           item["documentId"], item["subjectProfile"],
                           item["scenario"], item["lengthClass"],
                           " ".join(item.get("scenarioRoles") or []),
                           " ".join(item["wordFlowBlocksExercised"]),
                           " ".join(item["tableCellAnchorsExercised"]),
                           "cross-page межстраничный"
                           if item["crossPageRuleExercised"] else "",
                           "priority приоритет" if item["priority"] else ""]).lower()
        chips = []
        if item["priority"]:
            chips.append('<span class="chip pri">ПРИОРИТЕТ</span>')
        chips.append(f'<span class="chip">{esc(item["documentTitle"])}</span>')
        chips.append('<span class="chip">'
                     + ("юр. лицо" if item["subjectKind"] == "company"
                        else "физ. лицо") + "</span>")
        chips.append(f'<span class="chip">{esc(item["subjectProfile"])}</span>')
        chips.append(f'<span class="chip">стр.: {item["pageCount"]}</span>')
        lines = item["expectedInsertedLines"]
        if lines:
            chips.append(f'<span class="chip">+{lines} стр. текста</span>')
        else:
            chips.append('<span class="chip">без расширения</span>')
        if item["crossPageRuleExercised"]:
            chips.append('<span class="chip flow">межстраничный перенос</span>')
        for role in item.get("scenarioRoles") or []:
            chips.append(f'<span class="chip flow">{esc(role)}</span>')
        status_class = "ok" if item["structuralStatus"] == "PASS" else "bad"
        chips.append(f'<span class="chip {status_class}">структура: '
                     f'{esc(item["structuralStatus"])}'
                     f' ({verdict.get("checksPassed", "?")}/'
                     f'{verdict.get("checksRun", "?")})</span>')
        chips.append('<span class="status-chip chip">Не проверено</span>')

        checks = "".join(
            f'<li><label><input type="checkbox" data-check="{key}">'
            f"<span>{esc(text)}</span></label></li>"
            for key, text in CHECKLIST)

        out += [f'<div class="{classes}" data-id="{esc(item["pdfFilename"])}" '
                f'data-seq="{item["sequence"]}" data-doc="{esc(item["documentId"])}" '
                f'data-kind="{esc(item["subjectKind"])}" '
                f'data-scen="{esc(item["scenario"])}" '
                f'data-title="{esc(item["documentTitle"])}" '
                f'data-pri="{1 if item["priority"] else 0}" '
                f'data-search="{esc(search)}">',
                '<div class="row1">'
                f'<span class="seq">#{item["sequence"]:03d}</span>'
                f'<span class="name">{esc(item["pdfFilename"])}</span></div>',
                f'<div class="chips">{"".join(chips)}</div>',
                f'<p class="note">{esc(item["notes"])}</p>' if item["notes"] else "",
                '<div class="acts">',
                f'<a class="btn" href="{esc(item["pdfPath"])}" target="_blank" '
                'rel="noopener">Открыть PDF</a>',
                f'<a class="lnk" href="fixtures/documents/{esc(item["fixtureJson"])}" '
                'target="_blank" rel="noopener">Показать данные мока</a>',
                '<select class="status">'
                '<option value="not-reviewed">Не проверено</option>'
                '<option value="passed">Проверено — ОК</option>'
                '<option value="defect">Найден дефект</option>'
                '<option value="discuss">Требует обсуждения</option></select>',
                "</div>",
                f"<details><summary>Чек-лист визуальной проверки "
                f"({len(CHECKLIST)} пунктов)</summary>"
                f'<ul class="check">{checks}</ul></details>',
                '<textarea placeholder="Замечания по этому документу…"></textarea>',
                "</div>"]
    out.append("</section>")

    # ── Refused ──
    if refused:
        out.append(f"<section><h2>Не сгенерировано ({len(refused)})</h2>")
        for item in refused:
            kind = ("стресс-профиль, отказ ожидаем" if item["stressOnly"]
                    else "ограничение исходной формы — см. отчёт")
            out += [f'<div class="card stress">'
                    f'<div class="row1"><span class="seq">#{item["sequence"]:03d}'
                    f'</span><span class="name">{esc(item["documentTitle"])} — '
                    f'{esc(item["scenario"])}</span></div>'
                    f'<div class="chips"><span class="chip">'
                    f'{esc(item["subjectProfile"])}</span>'
                    f'<span class="chip">{esc(kind)}</span></div>'
                    f'<p class="note">{esc(item.get("generationMessage") or "")}</p>'
                    "</div>"]
        out.append("</section>")

    out += ["<section><h2>Файлы пакета</h2><p class=\"note\">",
            '<a class="lnk" href="README.md">README.md</a> · ',
            '<a class="lnk" href="smoke-checklist.md">smoke-checklist.md</a> · ',
            '<a class="lnk" href="manifest.json">manifest.json</a> · ',
            '<a class="lnk" href="manifest.csv">manifest.csv</a> · ',
            '<a class="lnk" href="reports/structural-report.json">'
            "structural-report.json</a> · ",
            '<a class="lnk" href="reports/generation-report.json">'
            "generation-report.json</a> · ",
            '<a class="lnk" href="reports/generation-report.csv">'
            "generation-report.csv</a> · ",
            '<a class="lnk" href="reports/visual-review-template.csv">'
            "visual-review-template.csv</a> · ",
            '<a class="lnk" href="reports/production-findings.json">'
            "production-findings.json</a> · ",
            '<a class="lnk" href="fixtures/values-library.json">'
            "values-library.json</a>",
            f"</p><p class=\"note\">Ограничений исходной вёрстки "
            f"зафиксировано: {len(limits)} (см. generation-report.json → "
            "knownLimits).</p></section>"]

    out += ["</main>", f"<script>{JS}</script>", "</body>", "</html>"]
    return "\n".join(part for part in out if part)


def build_checklist(manifest) -> str:
    items = [i for i in manifest["items"] if i["pdfFilename"]]
    priority = [i for i in items if i["priority"]]
    lines = [
        "# Чек-лист ручной визуальной проверки",
        "",
        "Пакет: **Word-flow, реалистично длинные синтетические данные**.",
        "Все данные вымышленные. Все файлы локальные.",
        "",
        "Тот же чек-лист встроен в `index.html` — там его можно отмечать "
        "и выгружать в CSV.",
        "",
        "## Как смотреть",
        "",
        "1. Запустите `tools\\start-smoke-pack.cmd`.",
        "2. Откройте каталог в браузере, начните с фильтра "
        "«только приоритетные».",
        "3. Для каждого PDF нажмите **Открыть PDF** и пройдите по пунктам ниже.",
        "4. Замеченное записывайте в поле заметок карточки.",
        "5. В конце нажмите **Выгрузить отчёт CSV**.",
        "",
        "## Что проверять в каждом документе",
        "",
    ]
    lines += [f"- [ ] {text}" for _key, text in CHECKLIST]
    lines += [
        "",
        "## Порядок первого прохода",
        "",
        "1. Доверенность — юридическое лицо.",
        "2. Доверенность — физическое лицо.",
        "3. Заявление о присоединении — юридическое лицо.",
        "4. Заявление о присоединении — физическое лицо.",
        "5. Анкеты.",
        "6. Расширение ячеек таблиц.",
        "7. Межстраничные переносы.",
        "8. Остальные документы.",
        "",
        f"## Приоритетные документы ({len(priority)})",
        "",
        "| № | Файл | Документ | Субъект | Сценарий |",
        "| ---: | --- | --- | --- | --- |",
    ]
    for item in priority:
        kind = "юр. лицо" if item["subjectKind"] == "company" else "физ. лицо"
        lines.append(f"| {item['sequence']} | `{item['pdfFilename']}` | "
                     f"{item['documentTitle']} | {kind} | {item['scenario']} |")
    lines += [
        "",
        "## Как записать дефект",
        "",
        "1. В карточке документа выберите статус **Найден дефект**.",
        "2. В заметках укажите: страницу, поле или блок, что видно, "
        "и как должно быть.",
        "3. Приложите имя PDF и имя фикстуры — по ним случай "
        "воспроизводится точно.",
        "4. Выгрузите CSV и передайте его вместе с PDF.",
        "",
    ]
    return "\n".join(lines) + "\n"


def main() -> int:
    def load(path, default=None):
        full = os.path.join(ROOT, path)
        if not os.path.isfile(full):
            return default if default is not None else {}
        with open(full, encoding="utf-8") as fh:
            return json.load(fh)

    manifest = load("manifest.json")
    if not manifest:
        print("manifest.json missing — run generate_smoke_pack.py first")
        return 1
    structural = load("reports/structural-report.json", {"results": []})
    findings = load("reports/production-findings.json", {"findings": []})
    shots = load("screenshots/screenshots.json", {"screenshots": []})
    generation = load("reports/generation-report.json", {"knownLimits": []})

    html = build_html(manifest, structural, findings, shots,
                      generation.get("knownLimits", []))
    with open(os.path.join(ROOT, "index.html"), "w", encoding="utf-8") as fh:
        fh.write(html)

    with open(os.path.join(ROOT, "smoke-checklist.md"), "w",
              encoding="utf-8") as fh:
        fh.write(build_checklist(manifest))

    generated = sum(1 for i in manifest["items"] if i["pdfFilename"])
    print(f"index.html          {len(html):,} bytes, {generated} cards")
    print("smoke-checklist.md  written")
    return 0


if __name__ == "__main__":
    sys.exit(main())
