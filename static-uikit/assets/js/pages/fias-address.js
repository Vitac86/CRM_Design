/**
 * fias-address.js
 * Compact FIAS-assisted address module for individual RF-resident clients.
 *
 * Architecture:
 *   - 3-row "Адреса" module in HTML (registration / actual / postal)
 *   - Each row has a readonly address display + "Редактировать" + optional "Заполнить адрес"
 *   - Clicking "Заполнить адрес" opens a FIAS panel for that row
 *   - FIAS panel: searchable combobox per level + "Итоговый адрес" preview + Отмена/Принять
 *   - "Принять" writes structured address parts into hidden fields and updates the readonly display
 *   - "Отмена" closes panel without modifying the row
 *   - Same-as-registration logic hides actual/postal independent fields when checked
 *
 * Security note: MASTER_TOKEN is a static demo placeholder.
 * UMI.CMS / backend must provide secure server-side FIAS API integration.
 */
(function () {
  'use strict';

  /* ── constants ─────────────────────────────────────────────────────────────── */
  const API_BASE     = 'https://fias-public-service.nalog.ru/api/spas/v2.0';
  const MASTER_TOKEN = 'pass'; // demo placeholder — real token via backend

  const FIELD_DEFS = {
    2:  { level: 2,  label: 'Район',                                  hint: 'Выберите район' },
    3:  { level: 3,  label: 'Муниципальный округ',                    hint: 'Выберите муниципальный округ' },
    5:  { level: 5,  label: 'Город',                                  hint: 'Выберите город' },
    6:  { level: 6,  label: 'Населённый пункт / поселение',           hint: 'Выберите населённый пункт' },
    7:  { level: 7,  label: 'Планировочная структура / территория',   hint: 'Выберите территорию' },
    8:  { level: 8,  label: 'Улица / УДС',                            hint: 'Выберите улицу' },
    9:  { level: 9,  label: 'Земельный участок',                      hint: 'Выберите участок' },
    10: { level: 10, label: 'Дом / строение',                         hint: 'Выберите дом' },
    11: { level: 11, label: 'Помещение / квартира',                   hint: 'Выберите помещение' },
    12: { level: 12, label: 'Комната',                                hint: 'Выберите комнату' },
    17: { level: 17, label: 'Машино-место',                           hint: 'Выберите машино-место' },
  };

  const ORDER_ADMIN = [2, 5, 6, 7, 8, 9, 10, 11, 12, 17];
  const ORDER_MUNIC = [3, 5, 6, 7, 8, 9, 10, 11, 12, 17];

  const ADDRESS_PART_KEYS = [
    'postalCode', 'country', 'region', 'district', 'city', 'settlement',
    'planningStructure', 'street', 'landPlot', 'house', 'building', 'flat',
    'room', 'comment', 'fiasObjectId', 'fiasPath', 'addressType',
    'isSameAsRegistration',
  ];

  const EDITOR_PART_FIELDS = [
    { key: 'postalCode', label: 'Индекс', inputMode: 'numeric', maxLength: 6 },
    { key: 'country', label: 'Страна' },
    { key: 'region', label: 'Регион' },
    { key: 'district', label: 'Район / муниципальный округ' },
    { key: 'city', label: 'Город' },
    { key: 'settlement', label: 'Населённый пункт' },
    { key: 'street', label: 'Улица / территория' },
    { key: 'house', label: 'Дом / строение' },
    { key: 'building', label: 'Корпус / строение / литера' },
    { key: 'flat', label: 'Квартира / помещение' },
    { key: 'room', label: 'Комната' },
    { key: 'comment', label: 'Комментарий / доп. сведения', textarea: true, wide: true },
  ];

  /* cached regions shared across widgets on same page load */
  let _regionsCache = null;

  /* ── division helpers ──────────────────────────────────────────────────────── */
  function getOrder(divType) {
    return divType === 'municipal' ? ORDER_MUNIC : ORDER_ADMIN;
  }

  function addrType(divType) {
    return divType === 'municipal' ? 2 : 1;
  }

  /* ── sorting utilities ──────────────────────────────────────────────────────── */
  function isNum(x) {
    if (x == null) return false;
    const s = String(x).trim();
    return s !== '' && !isNaN(Number(s));
  }
  function cmpStr(a, b) {
    return String(a || '').localeCompare(String(b || ''), 'ru', { sensitivity: 'base' });
  }
  function cmpNumOrStr(a, b) {
    const an = isNum(a), bn = isNum(b);
    if (an && bn) return Number(a) - Number(b);
    if (an && !bn) return -1;
    if (!an && bn) return 1;
    return cmpStr(a, b);
  }
  function lastH(addr) {
    const h = addr?.hierarchy;
    return (Array.isArray(h) && h.length) ? h[h.length - 1] : null;
  }
  function cmpTypes(a, b) {
    const A = lastH(a) || {}, B = lastH(b) || {};
    return cmpStr(A.type_short_name || A.type_name, B.type_short_name || B.type_name);
  }
  function cmpNames(a, b) {
    const A = lastH(a) || {}, B = lastH(b) || {};
    return cmpStr(A.name, B.name);
  }
  function cmpNums(a, b) {
    const A = lastH(a) || {}, B = lastH(b) || {};
    return cmpNumOrStr(A.number, B.number);
  }
  function cmpHouses(a, b) {
    const A = lastH(a) || {}, B = lastH(b) || {};
    let r = cmpTypes(a, b); if (r) return r;
    r = cmpNumOrStr(A.number, B.number); if (r) return r;
    r = cmpStr(A.add_type1_short_name, B.add_type1_short_name); if (r) return r;
    r = cmpNumOrStr(A.add_number1, B.add_number1); if (r) return r;
    r = cmpStr(A.add_type2_short_name, B.add_type2_short_name); if (r) return r;
    return cmpNumOrStr(A.add_number2, B.add_number2);
  }
  function sortForLevel(level, list) {
    const arr = [...(list || [])];
    arr.sort((a, b) => {
      const la = Number(a?.object_level_id ?? 0);
      const lb = Number(b?.object_level_id ?? 0);
      if (la !== lb) return la - lb;
      if ([9, 17].includes(level)) return cmpNums(a, b);
      if (level === 10) return cmpHouses(a, b);
      if ([11, 12].includes(level)) { let r = cmpTypes(a, b); return r || cmpNums(a, b); }
      let r = cmpTypes(a, b); return r || cmpNames(a, b);
    });
    return arr;
  }

  /* ── address text construction ──────────────────────────────────────────────── */
  const TYPE_MAP = new Map([
    ['г','город'],['город','город'],
    ['ул','улица'],['улица','улица'],
    ['пр-кт','проспект'],['просп','проспект'],['проспект','проспект'],
    ['пер','переулок'],['переулок','переулок'],
    ['ш','шоссе'],['шоссе','шоссе'],
    ['наб','набережная'],['набережная','набережная'],
    ['пл','площадь'],['площадь','площадь'],
    ['б-р','бульвар'],['бульвар','бульвар'],
    ['мкр','микрорайон'],['микрорайон','микрорайон'],
    ['р-н','район'],['район','район'],
    ['пос','посёлок'],['п','посёлок'],['посёлок','посёлок'],
    ['тер','территория'],['территория','территория'],
  ]);
  const ADD_TYPE_MAP = new Map([
    ['лит','литера'],['литера','литера'],
    ['корп','корпус'],['корпус','корпус'],
    ['стр','строение'],['строение','строение'],
    ['вл','владение'],['владение','владение'],
    ['соор','сооружение'],['сооружение','сооружение'],
  ]);

  function normType(h) {
    const raw = String(h?.type_name || h?.type_short_name || '').trim();
    return TYPE_MAP.get(raw.toLowerCase()) || raw.toLowerCase();
  }
  function normAddType(raw) {
    const s = String(raw || '').trim().toLowerCase();
    return ADD_TYPE_MAP.get(s) || s;
  }
  function segment(level, h) {
    if (!h) return null;
    if (level === 10) {
      const t = normType(h) || 'дом';
      const n = String(h.number || '').trim();
      if (!n) return null;
      let s = `${t} ${n}`;
      const at1 = normAddType(h.add_type1_short_name || h.add_type1_name);
      const an1 = String(h.add_number1 || '').trim();
      if (at1 && an1) s += ` ${at1} ${an1}`;
      const at2 = normAddType(h.add_type2_short_name || h.add_type2_name);
      const an2 = String(h.add_number2 || '').trim();
      if (at2 && an2) s += ` ${at2} ${an2}`;
      return s.trim();
    }
    if ([9, 11, 12, 17].includes(level)) {
      const t = normType(h), n = String(h.number || '').trim();
      if (t && n) return `${t} ${n}`.trim();
      if (t && h.name) return `${t} ${String(h.name).trim()}`.trim();
      return h.name ? String(h.name).trim() : null;
    }
    const t = normType(h), name = String(h.name || '').trim();
    if (t && name) return `${t} ${name}`.trim();
    const fn = String(h.full_name_short || h.full_name || '').trim();
    if (!fn) return null;
    return fn.includes(',') ? fn.split(',').pop().trim() : fn;
  }
  function shortName(addr) {
    const h = lastH(addr);
    if (!h) return addr.full_name || `id=${addr.object_id}`;
    return segment(addr.object_level_id, h) || addr.full_name || `id=${addr.object_id}`;
  }
  function canonical(s) {
    return String(s || '').toLowerCase()
      .replace(/ё/g, 'е')
      .replace(/[\s,.;:()№"']/g, ' ')
      .replace(/\s+/g, ' ').trim();
  }

  function duplicateKey(s) {
    return canonical(s)
      .replace(/^(г|город|ул|улица|д|дом|кв|квартира|помещение|комн|комната)\s+/i, '')
      .trim();
  }

  function compactPart(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
  }

  function addUniquePart(list, seen, value) {
    const part = compactPart(value);
    if (!part) return;
    const key = duplicateKey(part);
    if (key && seen.has(key)) return;
    list.push(part);
    if (key) seen.add(key);
  }

  function prefixedPart(value, prefix, re) {
    const part = compactPart(value);
    if (!part) return '';
    return re.test(part) ? part : `${prefix} ${part}`;
  }

  function buildAddressFromParts(parts) {
    const p = parts || {};
    const list = [];
    const seen = new Set();

    addUniquePart(list, seen, p.postalCode);
    addUniquePart(list, seen, p.country);
    addUniquePart(list, seen, p.region);
    addUniquePart(list, seen, p.district);
    addUniquePart(list, seen, p.city);
    addUniquePart(list, seen, p.settlement);
    addUniquePart(list, seen, p.planningStructure);
    addUniquePart(list, seen, p.landPlot);
    addUniquePart(list, seen, p.street);
    addUniquePart(list, seen, prefixedPart(p.house, 'д.', /^(д\.?|дом|вл\.?|владение|стр\.?|строение|соор\.?|сооружение)\s+/i));
    addUniquePart(list, seen, prefixedPart(p.building, 'корп.', /^(корп\.?|корпус|стр\.?|строение|лит\.?|литера)\s+/i));
    addUniquePart(list, seen, prefixedPart(p.flat, 'кв.', /^(кв\.?|квартира|пом\.?|помещение|оф\.?|офис)\s+/i));
    addUniquePart(list, seen, prefixedPart(p.room, 'комн.', /^(комн\.?|комната)\s+/i));
    addUniquePart(list, seen, p.comment);

    return list.join(', ');
  }

  /* ── postal code extraction ─────────────────────────────────────────────────── */
  function extractPostal(addr) {
    if (!addr) return null;
    if (addr.postal_code) return addr.postal_code;
    if (addr.address_details?.postal_code) return addr.address_details.postal_code;
    if (Array.isArray(addr.hierarchy)) {
      for (const h of addr.hierarchy) { const r = extractPostal(h); if (r) return r; }
    }
    return null;
  }

  /* ── API ───────────────────────────────────────────────────────────────────── */
  function apiFetch(path, { method = 'GET', body = null, signal } = {}) {
    const headers = { 'accept': 'application/json' };
    if (MASTER_TOKEN) headers['master-token'] = MASTER_TOKEN;
    if (body != null) headers['content-type'] = 'application/json';
    return fetch(`${API_BASE}${path}`, {
      method, headers,
      body: body != null ? JSON.stringify(body) : undefined,
      mode: 'cors',
      signal,
    }).then(res => {
      const ct = (res.headers.get('content-type') || '').toLowerCase();
      const pay = ct.includes('application/json')
        ? res.json().catch(() => null)
        : res.text().catch(() => '');
      return pay.then(payload => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return payload;
      });
    });
  }

  function apiGetRegions(signal) {
    if (_regionsCache) return Promise.resolve(_regionsCache);
    return apiFetch('/GetRegions', { method: 'GET', signal }).then(resp => {
      const regions = Array.isArray(resp?.addresses) ? resp.addresses
        : (Array.isArray(resp) ? resp : []);
      regions.sort((a, b) => String(a.full_name || '').localeCompare(String(b.full_name || ''), 'ru'));
      _regionsCache = regions;
      return regions;
    });
  }

  function apiGetItems(level, path, divType, signal) {
    const body = { address_levels: [level], address_type: addrType(divType), path: String(path), include_hist: true };
    return apiFetch('/GetAddressItems', { method: 'POST', body, signal }).then(resp => {
      const addrs = Array.isArray(resp?.addresses) ? resp.addresses : [];
      return addrs.filter(a => Number(a?.object_level_id) === Number(level));
    });
  }

  function apiGetById(objectId, divType, signal) {
    const qs = new URLSearchParams({ object_id: String(objectId), address_type: String(addrType(divType)) });
    return apiFetch(`/GetAddressItemById?${qs}`, { method: 'GET', signal }).then(resp => {
      const arr = Array.isArray(resp?.addresses) ? resp.addresses : [];
      return arr[0] || null;
    });
  }

  /* ── widget state ──────────────────────────────────────────────────────────── */
  function createState(kind) {
    return {
      kind,
      regions: [],
      region: null,
      divisionType: 'admin',
      currentPath: null,
      selectedByLevel: new Map(),
      optionsFullByLevel: new Map(),
      uiByLevel: new Map(),
      abortBatch: null,
      postalCodeCache: new Map(),
      fetchingPostalCode: null,
      el: {},
    };
  }

  /* ── DOM helpers ───────────────────────────────────────────────────────────── */
  function setStatus(el, text) { if (el) el.textContent = text || ''; }

  function hideLevel(state, level) {
    const ui = state.uiByLevel.get(level);
    if (!ui) return;
    ui.wrap.hidden = true;
    ui.menu.hidden = true;
    ui.menu.innerHTML = '';
    ui.input.value = '';
    ui.meta.textContent = '';
    state.optionsFullByLevel.delete(level);
    state.selectedByLevel.delete(level);
  }

  function hideAllLevels(state) {
    for (const lvl of Object.keys(FIELD_DEFS).map(Number)) hideLevel(state, lvl);
  }

  /* Build combobox menu items from a display list */
  function renderOptions(state, level, displayList) {
    const ui = state.uiByLevel.get(level);
    if (!ui) return;
    const sorted = sortForLevel(level, displayList);
    const currentSelected = state.selectedByLevel.get(level);

    ui.menu.innerHTML = '';
    for (const a of sorted) {
      const item = document.createElement('div');
      item.className = 'crm-fias-combobox-item';
      item.dataset.id = String(a.object_id);
      item.textContent = shortName(a);
      if (currentSelected && String(a.object_id) === String(currentSelected.object_id)) {
        item.classList.add('is-active');
      }
      ui.menu.appendChild(item);
    }
    if (!sorted.length) {
      const empty = document.createElement('div');
      empty.className = 'crm-fias-combobox-item crm-fias-combobox-item--empty';
      empty.textContent = 'Нет вариантов';
      ui.menu.appendChild(empty);
    }

    ui.wrap.hidden = false;
    ui.meta.textContent = `вариантов: ${sorted.length}`;
  }

  function applyFilter(state, level) {
    const ui = state.uiByLevel.get(level);
    if (!ui || ui.wrap.hidden) return;
    const q = ui.input.value.trim().toLowerCase();
    const full = state.optionsFullByLevel.get(level) || [];
    const selected = state.selectedByLevel.get(level) || null;
    let filtered = q
      ? full.filter(a => shortName(a).toLowerCase().includes(q) || (a.full_name || '').toLowerCase().includes(q))
      : full;
    if (selected && !filtered.some(x => String(x.object_id) === String(selected.object_id))) {
      filtered = [selected, ...filtered];
    }
    renderOptions(state, level, filtered);
    ui.meta.textContent = q ? `вариантов: ${filtered.length} (фильтр)` : `вариантов: ${filtered.length}`;
  }

  function ensureSelected(state, level, addr) {
    if (!addr?.object_id || addr.is_active === false) return;
    const full = state.optionsFullByLevel.get(level) || [];
    if (!full.some(x => String(x.object_id) === String(addr.object_id))) {
      state.optionsFullByLevel.set(level, [addr, ...full]);
    }
    state.selectedByLevel.set(level, addr);
    applyFilter(state, level);
    const ui = state.uiByLevel.get(level);
    if (ui) ui.input.value = shortName(addr);
  }

  /* ── postal code ───────────────────────────────────────────────────────────── */
  function collectPostalCodes(state) {
    const codes = new Set();
    for (const lvl of getOrder(state.divisionType)) {
      const addr = state.selectedByLevel.get(lvl);
      if (!addr) continue;
      const cached = state.postalCodeCache.get(addr.object_id);
      const code = cached !== undefined ? cached : extractPostal(addr);
      if (code) codes.add(code);
    }
    return [...codes].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }

  function refreshPostalDisplay(state) {
    const codes = collectPostalCodes(state);
    const text = codes.length ? `Индекс: ${codes.join(', ')}` : 'Индекс: —';
    if (state.el.postalPreview) state.el.postalPreview.textContent = text;
    setHidden(state, 'postalCode', codes.join(', '));
    refreshWidgetAddressFull(state);
  }

  function refreshWidgetAddressFull(state) {
    const widget = state.el.widgetEl;
    if (!widget) return;
    const parts = {};
    ADDRESS_PART_KEYS.forEach(key => { parts[key] = getHiddenInEl(widget, key); });
    const text = buildAddressFromParts(parts);
    if (!text) return;
    setHidden(state, 'addressFull', text);
    if (state.el.addrPreview) state.el.addrPreview.textContent = text;
  }

  function fetchPostal(state, objectId) {
    if (state.postalCodeCache.has(objectId)) { refreshPostalDisplay(state); return; }
    if (state.fetchingPostalCode === objectId) return;
    state.fetchingPostalCode = objectId;
    apiGetById(objectId, state.divisionType)
      .then(addr => state.postalCodeCache.set(objectId, extractPostal(addr) || ''))
      .catch(() => state.postalCodeCache.set(objectId, ''))
      .finally(() => { state.fetchingPostalCode = null; refreshPostalDisplay(state); });
  }

  function ensurePostal(state) {
    for (const lvl of getOrder(state.divisionType)) {
      const addr = state.selectedByLevel.get(lvl);
      if (!addr) continue;
      if (!state.postalCodeCache.has(addr.object_id) && !extractPostal(addr)) {
        fetchPostal(state, addr.object_id);
      }
    }
    refreshPostalDisplay(state);
  }

  /* ── hidden field helpers ──────────────────────────────────────────────────── */
  function setHidden(state, key, value) {
    const el = state.el.widgetEl?.querySelector(`[data-fias-field="${key}"]`);
    if (el) el.value = value || '';
  }

  function mirrorHiddenFields(srcWidget, dstWidget) {
    if (!srcWidget || !dstWidget) return;
    srcWidget.querySelectorAll('[data-fias-field]').forEach(sf => {
      const key = sf.dataset.fiasField;
      if (key === 'isSameAsRegistration') return;
      const df = dstWidget.querySelector(`[data-fias-field="${key}"]`);
      if (df) df.value = sf.value;
    });
  }

  function setHiddenInEl(el, key, value) {
    const f = el.querySelector(`[data-fias-field="${key}"]`);
    if (f) f.value = value || '';
  }

  function getHiddenInEl(el, key) {
    const f = el?.querySelector(`[data-fias-field="${key}"]`);
    return f ? f.value || '' : '';
  }

  function getAddressWidget(moduleEl, kind) {
    return moduleEl?.querySelector(`[data-fias-address-widget][data-address-kind="${kind}"]`) || null;
  }

  function getAddressOutput(moduleEl, kind) {
    return moduleEl?.querySelector(`[data-address-output="${kind}"]`) || null;
  }

  function readAddressParts(moduleEl, kind) {
    const widget = getAddressWidget(moduleEl, kind);
    const parts = {};
    ADDRESS_PART_KEYS.forEach(key => { parts[key] = getHiddenInEl(widget, key); });
    if (!parts.country && (parts.region || parts.fiasObjectId || parts.fiasPath)) parts.country = 'Россия';
    return parts;
  }

  function writeAddressParts(moduleEl, kind, parts) {
    const widget = getAddressWidget(moduleEl, kind);
    if (!widget) return;
    ADDRESS_PART_KEYS.forEach(key => {
      if (Object.prototype.hasOwnProperty.call(parts, key)) {
        setHiddenInEl(widget, key, parts[key]);
      }
    });
  }

  /* ── address text builder ──────────────────────────────────────────────────── */
  function buildAddressText(state) {
    const parts = [], seen = new Set();
    if (state.region?.full_name) {
      const r = state.region.full_name.trim();
      const cr = canonical(r);
      if (r && !seen.has(cr)) { parts.push(r); seen.add(cr); }
    }
    for (const lvl of getOrder(state.divisionType)) {
      const sel = state.selectedByLevel.get(lvl);
      if (!sel) continue;
      const seg = segment(lvl, lastH(sel));
      if (!seg) continue;
      const cs = canonical(seg);
      if (!seen.has(cs)) { parts.push(seg); seen.add(cs); }
    }
    const previewText = parts.length ? parts.join(', ') : '—';
    setHidden(state, 'region', state.region?.full_name || '');
    setHidden(state, 'country', state.region ? 'Россия' : '');
    setHidden(state, 'addressType', state.divisionType);

    const fields = {
      district: '', city: '', settlement: '', planningStructure: '', street: '',
      landPlot: '', house: '', building: '', flat: '', room: '', comment: '',
      fiasObjectId: '', fiasPath: '',
    };
    for (const lvl of getOrder(state.divisionType)) {
      const sel = state.selectedByLevel.get(lvl);
      if (!sel) continue;
      const seg = segment(lvl, lastH(sel));
      switch (lvl) {
        case 2: case 3: fields.district = seg || ''; break;
        case 5: fields.city = seg || ''; break;
        case 6: fields.settlement = seg || ''; break;
        case 7: fields.planningStructure = seg || ''; break;
        case 8: fields.street = seg || ''; break;
        case 9: fields.landPlot = seg || ''; break;
        case 10: fields.house = seg || ''; break;
        case 11: fields.flat = seg || ''; break;
        case 12: fields.room = seg || ''; break;
      }
      fields.fiasObjectId = String(sel.object_id);
      fields.fiasPath = String(sel.path || '');
    }
    for (const [k, v] of Object.entries(fields)) setHidden(state, k, v);

    ensurePostal(state);
    const fullText = buildAddressFromParts({
      postalCode: getHiddenInEl(state.el.widgetEl, 'postalCode'),
      country: getHiddenInEl(state.el.widgetEl, 'country'),
      region: getHiddenInEl(state.el.widgetEl, 'region'),
      district: fields.district,
      city: fields.city,
      settlement: fields.settlement,
      planningStructure: fields.planningStructure,
      street: fields.street,
      landPlot: fields.landPlot,
      house: fields.house,
      building: fields.building,
      flat: fields.flat,
      room: fields.room,
      comment: fields.comment,
    });
    if (state.el.addrPreview) state.el.addrPreview.textContent = fullText || previewText;
    setHidden(state, 'addressFull', fullText || (previewText !== '—' ? previewText : ''));
    notifyDependents(state);
    return fullText || previewText;
  }

  /* ── notify dependent (same-as) widgets — mirrors hidden FIAS fields ─────────── */
  function notifyDependents(state) {
    if (state.kind !== 'registration') return;
    const srcWidget = state.el.widgetEl;
    if (!srcWidget) return;
    const moduleEl = srcWidget.closest('[data-address-module]') || srcWidget.closest('form, [data-entity]') || document;
    const scope = moduleEl.querySelector ? moduleEl : document;
    scope.querySelectorAll('[data-address-same-as="registration"]').forEach(cb => {
      if (!cb.checked) return;
      const targetKind = cb.dataset.addressTarget;
      const targetWidget = scope.querySelector(`[data-fias-address-widget][data-address-kind="${targetKind}"]`);
      if (!targetWidget) return;
      mirrorHiddenFields(srcWidget, targetWidget);
      setHiddenInEl(targetWidget, 'isSameAsRegistration', 'true');
    });
  }

  /* ── level cascade loading ─────────────────────────────────────────────────── */
  function orderAfter(divType, level) {
    const order = getOrder(divType);
    const idx = order.indexOf(level);
    return idx >= 0 ? order.slice(idx + 1) : order;
  }

  function loadNextLevels(state, fromLevel, basePath) {
    if (!basePath) return;
    const toLoad = orderAfter(state.divisionType, fromLevel);
    if (!toLoad.length) return;

    if (state.abortBatch) state.abortBatch.abort();
    const ctrl = new AbortController();
    state.abortBatch = ctrl;
    state.currentPath = String(basePath);
    setStatus(state.el.midStatus, 'Загружаю…');

    const jobs = toLoad.map(lvl =>
      apiGetItems(lvl, basePath, state.divisionType, ctrl.signal)
        .then(items => ({ lvl, items, ok: true }))
        .catch(e => ({ lvl, items: [], ok: false, err: String(e) }))
    );

    Promise.all(jobs).then(results => {
      if (ctrl.signal.aborted) return;
      for (const r of results) {
        if (!r.ok) { hideLevel(state, r.lvl); continue; }
        if (r.items?.length) {
          const sorted = sortForLevel(r.lvl, r.items);
          state.optionsFullByLevel.set(r.lvl, sorted);
          renderOptions(state, r.lvl, sorted);
        } else {
          hideLevel(state, r.lvl);
        }
      }
      setStatus(state.el.midStatus, '');
      buildAddressText(state);
    });
  }

  /* ── parent sync by hierarchy ──────────────────────────────────────────────── */
  function pathForHierarchyPlace(fullPath, hp) {
    if (!fullPath) return null;
    const parts = String(fullPath).split('.');
    const n = Number(hp);
    if (!n || n < 1 || parts.length < n) return null;
    return parts.slice(0, n).join('.');
  }

  function addrFromHierarchyItem(hItem, computedPath) {
    const full_name = hItem.full_name || hItem.full_name_short
      || (hItem.name && (hItem.type_short_name || hItem.type_name)
        ? `${hItem.name} ${hItem.type_short_name || hItem.type_name}` : hItem.name)
      || null;
    return {
      object_id: hItem.object_id,
      object_level_id: hItem.object_level_id,
      full_name,
      path: computedPath || null,
      is_active: typeof hItem.is_active === 'boolean' ? hItem.is_active : true,
      hierarchy: [hItem],
      postal_code: hItem.postal_code,
    };
  }

  function syncParents(state, chosen) {
    if (!chosen || chosen.is_active === false) return;
    const chosenLevel = Number(chosen.object_level_id || 0);
    const map = new Map();
    for (const h of (chosen.hierarchy || [])) {
      const lvl = Number(h?.object_level_id);
      if (!lvl || !FIELD_DEFS[lvl]) continue;
      if (typeof h.is_active === 'boolean' && !h.is_active) continue;
      const p = pathForHierarchyPlace(chosen.path, h.hierarchy_place) || null;
      map.set(lvl, addrFromHierarchyItem(h, p));
    }
    for (const lvl of getOrder(state.divisionType)) {
      if (lvl >= chosenLevel) break;
      const parent = map.get(lvl);
      if (parent) ensureSelected(state, lvl, parent);
      else hideLevel(state, lvl);
    }
  }

  /* ── region combobox filter ────────────────────────────────────────────────── */
  function applyRegionFilter(state) {
    const input = state.el.regionInput;
    const menu = state.el.regionMenu;
    if (!input || !menu) return;
    const q = input.value.trim().toLowerCase();
    const filtered = q
      ? state.regions.filter(r => (r.full_name || '').toLowerCase().includes(q))
      : state.regions;
    menu.innerHTML = '';
    for (const r of filtered) {
      const item = document.createElement('div');
      item.className = 'crm-fias-combobox-item';
      item.dataset.id = String(r.object_id);
      item.textContent = r.full_name || `id=${r.object_id}`;
      if (state.region && String(state.region.object_id) === String(r.object_id)) {
        item.classList.add('is-active');
      }
      menu.appendChild(item);
    }
    if (!filtered.length) {
      const empty = document.createElement('div');
      empty.className = 'crm-fias-combobox-item crm-fias-combobox-item--empty';
      empty.textContent = 'Нет вариантов';
      menu.appendChild(empty);
    }
  }

  /* ── region loading ────────────────────────────────────────────────────────── */
  function loadRegions(state) {
    const input = state.el.regionInput;
    const menu = state.el.regionMenu;
    if (!input || !menu) return;
    input.disabled = true;
    input.placeholder = 'Загрузка…';
    setStatus(state.el.topStatus, 'Загружаю регионы…');

    apiGetRegions().then(regions => {
      state.regions = regions;
      input.disabled = false;
      input.placeholder = 'Выберите регион…';
      applyRegionFilter(state);
      setStatus(state.el.topStatus, `Регионов: ${regions.length}`);
    }).catch(() => {
      input.disabled = false;
      input.placeholder = 'Регионы недоступны';
      setStatus(state.el.topStatus, '');
      showFallback(state, 'ФИАС-сервис недоступен. Введите адрес вручную через «Редактировать».');
    });
  }

  function showFallback(state, msg) {
    const fb = state.el.fallbackWrap;
    if (!fb) return;
    fb.hidden = false;
    const msgEl = fb.querySelector('[data-fias-fallback-msg]');
    if (msgEl && msg) msgEl.textContent = msg;
  }

  /* ── widget DOM builder ────────────────────────────────────────────────────── */
  function buildWidgetUI(widgetEl, state) {
    const kind = state.kind;
    const inner = document.createElement('div');
    inner.className = 'crm-fias-inner';

    // 1. Division type selector
    const divRow = document.createElement('div');
    divRow.className = 'crm-fias-row crm-fias-divtype-row';
    divRow.innerHTML =
      '<label class="crm-fias-label">Тип деления</label>' +
      '<div class="crm-fias-divtype-opts">' +
        `<label class="crm-fias-radio-opt"><input type="radio" name="fias-divtype-${kind}" value="admin" checked> <span>Административное деление</span></label>` +
        `<label class="crm-fias-radio-opt"><input type="radio" name="fias-divtype-${kind}" value="municipal"> <span>Муниципальное деление</span></label>` +
      '</div>';
    inner.appendChild(divRow);

    // 2. Top status
    const topStatus = document.createElement('div');
    topStatus.className = 'crm-fias-status crm-fias-status--top';
    inner.appendChild(topStatus);
    state.el.topStatus = topStatus;

    // 3. Region row — searchable combobox
    const regionRow = document.createElement('div');
    regionRow.className = 'crm-fias-level-row';

    const regionLabel = document.createElement('label');
    regionLabel.className = 'crm-fias-label';
    regionLabel.textContent = 'Регион';

    const regionCombobox = document.createElement('div');
    regionCombobox.className = 'crm-fias-combobox';

    const regionInput = document.createElement('input');
    regionInput.className = 'uk-input crm-input crm-fias-combobox-input';
    regionInput.type = 'text';
    regionInput.placeholder = 'Выберите регион…';
    regionInput.autocomplete = 'off';

    const regionMenu = document.createElement('div');
    regionMenu.className = 'crm-fias-combobox-menu';
    regionMenu.hidden = true;

    regionCombobox.append(regionInput, regionMenu);
    regionRow.append(regionLabel, regionCombobox);
    inner.appendChild(regionRow);
    state.el.regionInput = regionInput;
    state.el.regionMenu = regionMenu;

    // Region combobox: open on focus
    regionInput.addEventListener('focus', () => {
      applyRegionFilter(state);
      regionMenu.hidden = false;
    });

    // Region combobox: filter on input
    regionInput.addEventListener('input', () => {
      applyRegionFilter(state);
      regionMenu.hidden = false;
    });

    // Region combobox: close / deselect / revert on blur
    regionInput.addEventListener('blur', () => {
      setTimeout(() => {
        if (regionMenu.hidden) return;
        regionMenu.hidden = true;
        if (!regionInput.value.trim()) {
          if (state.region) {
            if (state.abortBatch) { state.abortBatch.abort(); state.abortBatch = null; }
            state.region = null;
            state.currentPath = null;
            hideAllLevels(state);
            state.selectedByLevel.clear();
            state.optionsFullByLevel.clear();
            buildAddressText(state);
          }
        } else {
          regionInput.value = state.region ? (state.region.full_name || '') : '';
        }
      }, 150);
    });

    // Region combobox: Escape closes and reverts
    regionInput.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        regionMenu.hidden = true;
        regionInput.value = state.region ? (state.region.full_name || '') : '';
        regionInput.blur();
      }
    });

    // Region combobox: item click → select region and load levels
    regionMenu.addEventListener('click', e => {
      const item = e.target.closest('.crm-fias-combobox-item');
      if (!item || item.classList.contains('crm-fias-combobox-item--empty')) return;
      const id = item.dataset.id;
      const region = state.regions.find(r => String(r.object_id) === id);
      if (!region) return;
      if (state.abortBatch) { state.abortBatch.abort(); state.abortBatch = null; }
      state.region = region;
      regionInput.value = region.full_name || '';
      regionMenu.hidden = true;
      regionMenu.querySelectorAll('.crm-fias-combobox-item').forEach(el => el.classList.remove('is-active'));
      item.classList.add('is-active');
      hideAllLevels(state);
      state.selectedByLevel.clear();
      state.optionsFullByLevel.clear();
      const basePath = region.path || String(id);
      state.currentPath = String(basePath);
      buildAddressText(state);
      loadNextLevels(state, 'region', basePath);
    });

    // 4. Mid status
    const midStatus = document.createElement('div');
    midStatus.className = 'crm-fias-status crm-fias-status--mid';
    inner.appendChild(midStatus);
    state.el.midStatus = midStatus;

    // 5. Dynamic levels container
    const levelsContainer = document.createElement('div');
    levelsContainer.className = 'crm-fias-levels';
    inner.appendChild(levelsContainer);
    state.el.levelsContainer = levelsContainer;

    // 6. Address preview — labelled "Итоговый адрес"
    const previewWrap = document.createElement('div');
    previewWrap.className = 'crm-fias-preview';
    const previewLabel = document.createElement('div');
    previewLabel.className = 'crm-fias-preview-label';
    previewLabel.textContent = 'Итоговый адрес';
    const addrPreview = document.createElement('div');
    addrPreview.className = 'crm-fias-preview-addr';
    addrPreview.dataset.fiasAddrPreview = '';
    addrPreview.textContent = '—';
    const postalPreview = document.createElement('div');
    postalPreview.className = 'crm-fias-preview-postal';
    postalPreview.textContent = 'Индекс: —';
    previewWrap.append(previewLabel, addrPreview, postalPreview);
    inner.appendChild(previewWrap);
    state.el.addrPreview = addrPreview;
    state.el.postalPreview = postalPreview;

    // 7. Manual fallback (shown if API fails)
    const fallbackWrap = document.createElement('div');
    fallbackWrap.className = 'crm-fias-fallback';
    fallbackWrap.hidden = true;
    fallbackWrap.innerHTML =
      '<p class="crm-fias-fallback-msg" data-fias-fallback-msg>ФИАС-сервис недоступен. Введите адрес вручную.</p>';
    inner.appendChild(fallbackWrap);
    state.el.fallbackWrap = fallbackWrap;

    // 8. Hidden output fields
    const hiddenKeys = ['addressFull', ...ADDRESS_PART_KEYS];
    const hiddenWrap = document.createElement('div');
    hiddenWrap.hidden = true;
    hiddenWrap.setAttribute('aria-hidden', 'true');
    for (const key of hiddenKeys) {
      const inp = document.createElement('input');
      inp.type = 'hidden';
      inp.name = `address[${kind}][${key}]`;
      inp.dataset.fiasField = key;
      hiddenWrap.appendChild(inp);
    }
    inner.appendChild(hiddenWrap);

    widgetEl.appendChild(inner);
    widgetEl._fiasState = state;
    state.el.widgetEl = widgetEl;

    installLevelRows(state, levelsContainer);
    wireWidgetEvents(state, divRow);
  }

  /* ── level rows: searchable combobox (input + dropdown menu) per level ─────── */
  function installLevelRows(state, container) {
    container.innerHTML = '';
    state.uiByLevel.clear();

    const levels = Object.keys(FIELD_DEFS).map(Number).sort((a, b) => a - b);
    for (const level of levels) {
      const def = FIELD_DEFS[level];
      const wrap = document.createElement('div');
      wrap.className = 'crm-fias-level-row';
      wrap.hidden = true;

      const label = document.createElement('label');
      label.className = 'crm-fias-label';
      label.textContent = def.label;

      const combobox = document.createElement('div');
      combobox.className = 'crm-fias-combobox';

      const input = document.createElement('input');
      input.className = 'uk-input crm-input crm-fias-combobox-input';
      input.type = 'text';
      input.placeholder = def.hint;
      input.autocomplete = 'off';

      const menu = document.createElement('div');
      menu.className = 'crm-fias-combobox-menu';
      menu.hidden = true;

      const meta = document.createElement('div');
      meta.className = 'crm-fias-meta';

      combobox.append(input, menu);
      wrap.append(label, combobox, meta);
      container.appendChild(wrap);
      state.uiByLevel.set(level, { wrap, input, menu, meta });

      // Open dropdown on focus
      input.addEventListener('focus', () => {
        if (!wrap.hidden) {
          applyFilter(state, level);
          menu.hidden = false;
        }
      });

      // Filter on typing
      input.addEventListener('input', () => {
        if (!wrap.hidden) {
          applyFilter(state, level);
          menu.hidden = false;
        }
      });

      // Close / deselect / revert on blur — 150ms so click on menu item fires first
      input.addEventListener('blur', () => {
        setTimeout(() => {
          if (menu.hidden) return; // click handler already closed it
          menu.hidden = true;
          const currentSelected = state.selectedByLevel.get(level);
          if (!input.value.trim()) {
            if (currentSelected) {
              state.selectedByLevel.delete(level);
              const order = getOrder(state.divisionType);
              const idx = order.indexOf(level);
              if (idx >= 0) for (let i = idx + 1; i < order.length; i++) hideLevel(state, order[i]);
              buildAddressText(state);
            }
          } else {
            // Revert to selected display name (or clear if nothing was selected)
            input.value = currentSelected ? shortName(currentSelected) : '';
          }
        }, 150);
      });

      // Escape: close menu, revert input to current selection
      input.addEventListener('keydown', e => {
        if (e.key === 'Escape') {
          menu.hidden = true;
          const currentSelected = state.selectedByLevel.get(level);
          input.value = currentSelected ? shortName(currentSelected) : '';
          input.blur();
        }
      });

      // Item click: select and trigger cascade
      menu.addEventListener('click', e => {
        const item = e.target.closest('.crm-fias-combobox-item');
        if (!item || item.classList.contains('crm-fias-combobox-item--empty')) return;
        const id = item.dataset.id;
        const full = state.optionsFullByLevel.get(level) || [];
        const chosen = full.find(x => String(x.object_id) === id);
        if (!chosen) return;

        state.selectedByLevel.set(level, chosen);
        input.value = shortName(chosen);
        menu.hidden = true;
        menu.querySelectorAll('.crm-fias-combobox-item').forEach(el => el.classList.remove('is-active'));
        item.classList.add('is-active');

        if (chosen.hierarchy && chosen.path) syncParents(state, chosen);

        // Clear levels below the selected one
        const order = getOrder(state.divisionType);
        const idx = order.indexOf(level);
        if (idx >= 0) for (let i = idx + 1; i < order.length; i++) hideLevel(state, order[i]);

        const nextPath = chosen.path || (state.currentPath ? `${state.currentPath}.${chosen.object_id}` : String(chosen.object_id));
        state.currentPath = String(nextPath);
        buildAddressText(state);
        loadNextLevels(state, level, nextPath);
      });
    }
  }

  /* ── widget event wiring — division type radio only ───────────────────────── */
  function wireWidgetEvents(state, divRow) {
    divRow.querySelectorAll('input[type="radio"]').forEach(radio => {
      radio.addEventListener('change', () => {
        if (!radio.checked || radio.value === state.divisionType) return;
        const prevRegion = state.region;
        const prevRegionName = state.el.regionInput?.value || '';
        state.divisionType = radio.value;
        if (state.abortBatch) { state.abortBatch.abort(); state.abortBatch = null; }
        hideAllLevels(state);
        state.selectedByLevel.clear();
        state.optionsFullByLevel.clear();
        state.region = prevRegion; // preserved — no reset
        if (state.el.regionInput) state.el.regionInput.value = prevRegionName;
        buildAddressText(state);
        if (state.region) {
          const basePath = state.region.path || String(state.region.object_id);
          loadNextLevels(state, 'region', basePath);
        }
      });
    });
  }

  /* ── manual parts editor helpers ───────────────────────────────────────────── */
  function isAddressModuleRfResident(moduleEl) {
    const editResidency = document.getElementById('ind-residency');
    if (editResidency) return editResidency.value !== 'nonresident';

    const flResidency = document.querySelector('input[type="radio"][name="fl-residency"]:checked');
    if (flResidency) return flResidency.value === 'rf';

    return true;
  }

  function shouldShowFillButton(moduleEl, kind) {
    if (!isAddressModuleRfResident(moduleEl)) return false;
    const sameCheck = moduleEl.querySelector(`[data-address-same-as][data-address-target="${kind}"]`);
    return !sameCheck || !sameCheck.checked;
  }

  function syncFillButton(moduleEl, kind) {
    const fillBtn = moduleEl.querySelector(`[data-action="open-fias-address"][data-address-target="${kind}"]`);
    if (fillBtn) fillBtn.hidden = !shouldShowFillButton(moduleEl, kind);
  }

  function hasAddressData(moduleEl, kind) {
    const output = getAddressOutput(moduleEl, kind);
    if (compactPart(output?.value)) return true;

    const widget = getAddressWidget(moduleEl, kind);
    const panel = moduleEl?.querySelector(`[data-fias-panel="${kind}"]`);
    const snapshot = panel?._addressHiddenSnapshot || null;
    const hiddenValue = key => snapshot ? snapshot[key] : getHiddenInEl(widget, key);

    if (compactPart(hiddenValue('addressFull'))) return true;

    return [
      'postalCode', 'country', 'region', 'district', 'city', 'settlement',
      'planningStructure', 'street', 'landPlot', 'house', 'building', 'flat',
      'room', 'comment', 'fiasObjectId', 'fiasPath',
    ].some(key => compactPart(hiddenValue(key)));
  }

  function syncEditButton(moduleEl, kind) {
    const btn = moduleEl.querySelector(`[data-action="edit-address-parts"][data-address-target="${kind}"]`);
    if (!btn) return;

    const sameCheck = moduleEl.querySelector(`[data-address-same-as][data-address-target="${kind}"]`);
    const isSameAsRegistration = sameCheck && sameCheck.checked;
    btn.hidden = isSameAsRegistration || !hasAddressData(moduleEl, kind);
  }

  function syncAllAddressEditButtons(moduleEl) {
    if (!moduleEl) return;
    ['registration', 'actual', 'postal'].forEach(kind => syncEditButton(moduleEl, kind));
  }

  function snapshotPanelHiddenFields(panel) {
    const widget = panel?.querySelector('[data-fias-address-widget]');
    if (!widget) return;
    const keys = ['addressFull', ...ADDRESS_PART_KEYS];
    panel._addressHiddenSnapshot = keys.reduce((acc, key) => {
      acc[key] = getHiddenInEl(widget, key);
      return acc;
    }, {});
  }

  function restorePanelHiddenSnapshot(panel) {
    const widget = panel?.querySelector('[data-fias-address-widget]');
    const snapshot = panel?._addressHiddenSnapshot;
    if (!widget || !snapshot) return;
    Object.entries(snapshot).forEach(([key, value]) => {
      setHiddenInEl(widget, key, value);
    });
    delete panel._addressHiddenSnapshot;
  }

  function closeFiasPanels(moduleEl) {
    moduleEl?.querySelectorAll('[data-fias-panel]').forEach(panel => {
      if (!panel.hidden) restorePanelHiddenSnapshot(panel);
      panel.hidden = true;
    });
  }

  function closePartsEditors(moduleEl, exceptEditor) {
    moduleEl?.querySelectorAll('[data-address-parts-editor]').forEach(editor => {
      if (editor !== exceptEditor) editor.hidden = true;
    });
  }

  function hasMeaningfulParts(parts) {
    return [
      'postalCode', 'region', 'district', 'city', 'settlement',
      'planningStructure', 'street', 'landPlot', 'house', 'building',
      'flat', 'room', 'comment',
    ].some(key => compactPart(parts?.[key]));
  }

  function fallbackPartsFromDisplay(text) {
    const parts = {};
    let rest = compactPart(text);
    const postalMatch = rest.match(/^(\d{6})(?:\s*,\s*)?/);
    if (postalMatch) {
      parts.postalCode = postalMatch[1];
      rest = rest.slice(postalMatch[0].length).trim();
    }
    if (rest) parts.comment = rest;
    return parts;
  }

  function getCurrentAddressParts(moduleEl, kind) {
    const output = getAddressOutput(moduleEl, kind);
    const parts = readAddressParts(moduleEl, kind);

    if (!hasMeaningfulParts(parts) && output?.value) {
      Object.assign(parts, fallbackPartsFromDisplay(output.value));
    } else if (!parts.postalCode && output?.value) {
      const fallback = fallbackPartsFromDisplay(output.value);
      if (fallback.postalCode) parts.postalCode = fallback.postalCode;
    }

    if (!parts.country && hasMeaningfulParts(parts)) {
      parts.country = isAddressModuleRfResident(moduleEl) ? 'Россия' : '';
    }

    if (!parts.street) {
      parts.street = [parts.planningStructure, parts.landPlot].filter(Boolean).join(', ');
    }

    return parts;
  }

  function buildPartsEditor(editor) {
    if (!editor || editor.dataset.addressPartsReady === 'true') return;
    const grid = document.createElement('div');
    grid.className = 'crm-address-parts-grid';

    EDITOR_PART_FIELDS.forEach(def => {
      const label = document.createElement('label');
      label.className = `crm-address-part-field${def.wide ? ' crm-address-part-field--wide' : ''}`;

      const caption = document.createElement('span');
      caption.className = 'crm-address-part-label';
      caption.textContent = def.label;

      const field = def.textarea ? document.createElement('textarea') : document.createElement('input');
      field.className = def.textarea ? 'uk-textarea crm-input' : 'uk-input crm-input';
      field.dataset.addressPart = def.key;
      if (!def.textarea) field.type = 'text';
      if (def.inputMode) field.inputMode = def.inputMode;
      if (def.maxLength) field.maxLength = def.maxLength;
      if (def.textarea) field.rows = 2;
      field.autocomplete = 'off';

      label.append(caption, field);
      grid.appendChild(label);
    });

    const actions = document.createElement('div');
    actions.className = 'crm-address-parts-actions';

    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.className = 'uk-button uk-button-default crm-button';
    cancelBtn.dataset.action = 'cancel-address-parts';
    cancelBtn.textContent = 'Отмена';

    const okBtn = document.createElement('button');
    okBtn.type = 'button';
    okBtn.className = 'uk-button uk-button-primary crm-button';
    okBtn.dataset.action = 'apply-address-parts';
    okBtn.textContent = 'ОК';

    actions.append(cancelBtn, okBtn);
    editor.append(grid, actions);
    editor.dataset.addressPartsReady = 'true';
  }

  function fillPartsEditor(editor, parts) {
    EDITOR_PART_FIELDS.forEach(def => {
      const field = editor.querySelector(`[data-address-part="${def.key}"]`);
      if (field) field.value = parts?.[def.key] || '';
    });
  }

  function collectPartsFromEditor(moduleEl, kind, editor) {
    const parts = readAddressParts(moduleEl, kind);
    EDITOR_PART_FIELDS.forEach(def => {
      const field = editor.querySelector(`[data-address-part="${def.key}"]`);
      if (field) parts[def.key] = compactPart(field.value);
    });
    if (!parts.addressType) parts.addressType = parts.fiasObjectId ? 'admin' : 'manual';
    parts.addressFull = buildAddressFromParts(parts);

    if (!parts.addressFull) {
      ADDRESS_PART_KEYS.forEach(key => { parts[key] = ''; });
      parts.addressFull = '';
    }

    return parts;
  }

  function applyAddressParts(moduleEl, kind, parts) {
    const widget = getAddressWidget(moduleEl, kind);
    const output = getAddressOutput(moduleEl, kind);
    const addressText = buildAddressFromParts(parts) || compactPart(parts?.addressFull);

    writeAddressParts(moduleEl, kind, parts);
    if (widget) setHiddenInEl(widget, 'addressFull', addressText);
    if (output) output.value = addressText;

    if (kind === 'registration') {
      updateSameNoteText(moduleEl, addressText);
    }
    syncAllAddressEditButtons(moduleEl);
  }

  function initAddressPartsEditors() {
    document.querySelectorAll('[data-address-parts-editor]').forEach(buildPartsEditor);

    document.querySelectorAll('[data-action="edit-address-parts"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const kind = btn.dataset.addressTarget;
        const moduleEl = btn.closest('[data-address-module]');
        if (!moduleEl || !kind) return;
        if (!hasAddressData(moduleEl, kind)) {
          syncEditButton(moduleEl, kind);
          return;
        }
        const editor = moduleEl.querySelector(`[data-address-parts-editor="${kind}"]`);
        if (!editor) return;

        buildPartsEditor(editor);
        closeFiasPanels(moduleEl);
        closePartsEditors(moduleEl, editor);
        fillPartsEditor(editor, getCurrentAddressParts(moduleEl, kind));
        editor.hidden = false;
      });
    });

    document.querySelectorAll('[data-action="cancel-address-parts"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const editor = btn.closest('[data-address-parts-editor]');
        if (editor) editor.hidden = true;
      });
    });

    document.querySelectorAll('[data-action="apply-address-parts"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const editor = btn.closest('[data-address-parts-editor]');
        const moduleEl = btn.closest('[data-address-module]');
        if (!editor || !moduleEl) return;
        const kind = editor.dataset.addressPartsEditor;
        if (!kind) return;
        const parts = collectPartsFromEditor(moduleEl, kind, editor);
        applyAddressParts(moduleEl, kind, parts);
        syncAllAddressEditButtons(moduleEl);
        editor.hidden = true;
      });
    });
  }

  /* ── address module: panel open / close / accept ───────────────────────────── */
  function initAddressModule() {
    // "Заполнить адрес" — open FIAS panel for that row
    document.querySelectorAll('[data-action="open-fias-address"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const target = btn.dataset.addressTarget;
        const moduleEl = btn.closest('[data-address-module]');
        if (!moduleEl) return;
        if (!shouldShowFillButton(moduleEl, target)) return;
        // Close other open panels in this module first
        closeFiasPanels(moduleEl);
        closePartsEditors(moduleEl);
        const panel = moduleEl.querySelector(`[data-fias-panel="${target}"]`);
        if (panel) {
          snapshotPanelHiddenFields(panel);
          panel.hidden = false;
        }
      });
    });

    // "Отмена" — close panel without changes
    document.querySelectorAll('[data-action="fias-cancel"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const panel = btn.closest('[data-fias-panel]');
        if (panel) {
          restorePanelHiddenSnapshot(panel);
          panel.hidden = true;
          const moduleEl = panel.closest('[data-address-module]');
          syncAllAddressEditButtons(moduleEl);
        }
      });
    });

    // "Принять" — write selected FIAS parts into hidden fields + readonly display
    document.querySelectorAll('[data-action="fias-accept"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const target = btn.dataset.addressTarget;
        const panel = btn.closest('[data-fias-panel]');
        if (!panel) return;
        const moduleEl = panel.closest('[data-address-module]');
        if (!moduleEl) return;

        const widget = panel.querySelector('[data-fias-address-widget]');
        if (widget) {
          const parts = readAddressParts(moduleEl, target);
          const addrText = buildAddressFromParts(parts) || getHiddenInEl(widget, 'addressFull');
          setHiddenInEl(widget, 'addressFull', addrText);
          applyAddressParts(moduleEl, target, { ...parts, addressFull: addrText });
          syncAllAddressEditButtons(moduleEl);
        }
        delete panel._addressHiddenSnapshot;
        panel.hidden = true;
      });
    });
  }

  /* ── same-note preview text helper ─────────────────────────────────────────── */
  function updateSameNoteText(moduleEl, addrText) {
    const sourceWidget = getAddressWidget(moduleEl, 'registration');
    moduleEl.querySelectorAll('[data-address-same-as="registration"]').forEach(cb => {
      if (!cb.checked) return;
      const targetKind = cb.dataset.addressTarget;
      const note = moduleEl.querySelector(`[data-address-same-note="${targetKind}"]`);
      const targetOutput = getAddressOutput(moduleEl, targetKind);
      const targetWidget = getAddressWidget(moduleEl, targetKind);

      if (note) {
        const preview = note.querySelector('[data-same-preview-text]');
        if (preview) preview.textContent = addrText || '';
      }
      if (targetOutput) targetOutput.value = addrText || '';
      if (sourceWidget && targetWidget) {
        mirrorHiddenFields(sourceWidget, targetWidget);
        setHiddenInEl(targetWidget, 'isSameAsRegistration', 'true');
      }
    });
    syncAllAddressEditButtons(moduleEl);
  }

  /* ── same-as checkboxes: show/hide row fields and fill button ───────────────── */
  function initSameAsCheckboxes() {
    document.querySelectorAll('[data-address-same-as]').forEach(cb => {
      const targetKind = cb.dataset.addressTarget;
      const sourceKind = cb.dataset.addressSameAs;

      function syncRow() {
        const moduleEl = cb.closest('[data-address-module]');
        if (!moduleEl) return;

        const note       = moduleEl.querySelector(`[data-address-same-note="${targetKind}"]`);
        const rowFields  = moduleEl.querySelector(`[data-address-row-fields="${targetKind}"]`);
        const fillBtn    = moduleEl.querySelector(`[data-action="open-fias-address"][data-address-target="${targetKind}"]`);
        const panel      = moduleEl.querySelector(`[data-fias-panel="${targetKind}"]`);
        const editor     = moduleEl.querySelector(`[data-address-parts-editor="${targetKind}"]`);
        const tgtWidget  = moduleEl.querySelector(`[data-fias-address-widget][data-address-kind="${targetKind}"]`);
        const srcWidget  = moduleEl.querySelector(`[data-fias-address-widget][data-address-kind="${sourceKind}"]`);
        const srcOutput  = moduleEl.querySelector(`[data-address-output="${sourceKind}"]`);
        const tgtOutput  = moduleEl.querySelector(`[data-address-output="${targetKind}"]`);

        if (cb.checked) {
          if (note) {
            note.hidden = false;
            const previewEl = note.querySelector('[data-same-preview-text]');
            if (previewEl) previewEl.textContent = srcOutput?.value || '';
          }
          if (rowFields) rowFields.hidden = true;
          if (fillBtn)   fillBtn.hidden   = true;
          if (panel) {
            restorePanelHiddenSnapshot(panel);
            panel.hidden = true;
          }
          if (editor)    editor.hidden    = true;
          if (tgtOutput) tgtOutput.value  = srcOutput?.value || '';
          if (tgtWidget) {
            setHiddenInEl(tgtWidget, 'isSameAsRegistration', 'true');
            if (srcWidget) mirrorHiddenFields(srcWidget, tgtWidget);
          }
        } else {
          if (note)      note.hidden     = true;
          if (rowFields) rowFields.hidden = false;
          syncFillButton(moduleEl, targetKind);
          if (tgtWidget) setHiddenInEl(tgtWidget, 'isSameAsRegistration', 'false');
        }
        syncAllAddressEditButtons(moduleEl);
      }

      cb.addEventListener('change', syncRow);
      syncRow();
    });
  }

  /* ── registration output → mirror same-as previews if legacy scripts write it ─ */
  function wireRegistrationTextareaInput() {
    document.querySelectorAll('[data-address-output="registration"]').forEach(textarea => {
      const moduleEl = textarea.closest('[data-address-module]');
      if (!moduleEl) return;
      textarea.addEventListener('input', () => {
        updateSameNoteText(moduleEl, textarea.value);
        syncAllAddressEditButtons(moduleEl);
      });
    });
  }

  /* ── main init ─────────────────────────────────────────────────────────────── */
  function initFiasAddress() {
    const widgets = document.querySelectorAll('[data-fias-address-widget]');
    if (!widgets.length) return;

    widgets.forEach(widgetEl => {
      const kind = widgetEl.dataset.addressKind;
      if (!kind) return;
      const state = createState(kind);
      buildWidgetUI(widgetEl, state);
      loadRegions(state);
    });

    initSameAsCheckboxes();
    initAddressPartsEditors();
    initAddressModule();
    wireRegistrationTextareaInput();
    document.querySelectorAll('[data-address-module]').forEach(syncAllAddressEditButtons);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initFiasAddress);
  } else {
    initFiasAddress();
  }
})();
