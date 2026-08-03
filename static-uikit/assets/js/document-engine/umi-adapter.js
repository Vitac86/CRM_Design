// The one place that turns a map's `source` into a value from the payload.
//
// Two naming systems meet here and both have to keep working:
//
//   umi.*      the canonical, exact names from the UMI workbook — what a map
//              should say, and what the documentation and the Template Builder
//              show a reviewer;
//   subject.*  the CRM payload names this repository grew before the workbook
//   field.*    existed. They stay resolvable so no map has to be renamed in a
//   extra.*    commit that also changes layout, but they are aliases: the
//   check.*    registry records what each one means in UMI terms.
//
// Nothing else in the engine may read the payload directly. That is the whole
// point — a source name that nobody can explain has exactly one place to fail.

(function (global) {
  'use strict';

  var ns = global.CRMDocumentEngine = global.CRMDocumentEngine || {};
  var Adapter = {};

  var LEGACY_NS = { subject: 'subject', field: 'fields', extra: 'extraValues',
                    check: 'checks' };

  // Address components, in the order the printed forms use them. One formatted
  // address is assembled from the exact UMI components; a map prints either the
  // formatted address or individual components, never both, so a value cannot
  // appear twice on one form.
  var ADDRESS_ORDER = ['index', 'country', 'region', 'district', 'city',
                       'settlement', 'street', 'house', 'corps', 'flat'];
  var ADDRESS_PREFIX = { street: 'ул. ', house: 'д. ', corps: 'корп. ',
                         flat: 'кв. ', city: 'г. ' };

  function registry() { return ns.umiRegistry || null; }

  // The UMI structure a subject-relative `umi.<name>` resolves against.
  function structureForSubject(kind) {
    var reg = registry();
    if (!reg) return null;
    var map = reg.subjectStructures || {};
    for (var key in map) {
      if (Object.prototype.hasOwnProperty.call(map, key) && map[key] === kind) {
        return key;
      }
    }
    return null;
  }

  function legacyRead(nsName, key, payload) {
    var bucket = payload && payload[LEGACY_NS[nsName]];
    if (!bucket) return undefined;
    return Object.prototype.hasOwnProperty.call(bucket, key)
      ? bucket[key] : undefined;
  }

  // A payload may carry UMI values directly under `payload.umi`, keyed either
  // by structure (`payload.umi.company.origname`) or flat for the subject
  // structure (`payload.umi.origname`). Both are read here so an integration
  // can start sending exact names without the maps changing again.
  function umiRead(structureKey, name, payload) {
    var root = payload && payload.umi;
    if (!root) return undefined;
    var scoped = structureKey && root[structureKey];
    if (scoped && Object.prototype.hasOwnProperty.call(scoped, name)) {
      return scoped[name];
    }
    if (Object.prototype.hasOwnProperty.call(root, name)) return root[name];
    return undefined;
  }

  function formatAddress(parts) {
    var out = [];
    ADDRESS_ORDER.forEach(function (key) {
      var value = parts[key];
      if (value == null || String(value).trim() === '') return;
      out.push((ADDRESS_PREFIX[key] || '') + String(value).trim());
    });
    return out.join(', ');
  }

  // `umi.address.registration` / `umi.address.legal` — the one formatted
  // address. Assembled from the exact components when they are present;
  // otherwise the CRM payload's already-formatted address is used, so an
  // integration that only sends the formatted string still prints.
  function resolveAddress(which, payload) {
    var subject = payload && payload.subject;
    var kind = subject && subject.kind;
    var structureKey = structureForSubject(kind);
    var parts = {};
    var found = false;
    ADDRESS_ORDER.forEach(function (key) {
      var value = umiRead(structureKey, key, payload);
      if (value != null && String(value).trim() !== '') {
        parts[key] = value;
        found = true;
      }
    });
    if (found) return formatAddress(parts);
    var fields = payload && payload.fields;
    if (!fields) return undefined;
    var legacyKey = which === 'legal'
      ? 'client-legal-address' : 'client-registration-address';
    return Object.prototype.hasOwnProperty.call(fields, legacyKey)
      ? fields[legacyKey] : undefined;
  }

  // Resolve one source path against one payload.
  //
  // Returns undefined for an unknown namespace or a missing key so the caller
  // can still tell "absent" from "empty string" — the renderer relies on that
  // distinction to report a required value as missing rather than blank.
  function resolve(path, payload) {
    if (!path || typeof path !== 'string' || !payload) return undefined;
    var dot = path.indexOf('.');
    if (dot === -1) return undefined;
    var head = path.slice(0, dot);
    var rest = path.slice(dot + 1);

    if (Object.prototype.hasOwnProperty.call(LEGACY_NS, head)) {
      return legacyRead(head, rest, payload);
    }
    if (head !== 'umi') return undefined;

    var nextDot = rest.indexOf('.');
    var maybeStructure = nextDot === -1 ? '' : rest.slice(0, nextDot);

    if (maybeStructure === 'address') {
      return resolveAddress(rest.slice(nextDot + 1), payload);
    }

    var reg = registry();
    var structures = reg ? (reg.subjectStructures || {}) : {};
    if (maybeStructure &&
        (Object.prototype.hasOwnProperty.call(structures, maybeStructure) ||
         hasStructure(maybeStructure))) {
      return umiRead(maybeStructure, rest.slice(nextDot + 1), payload);
    }

    // Subject-relative `umi.<name>`.
    var kind = payload.subject && payload.subject.kind;
    return umiRead(structureForSubject(kind), rest, payload);
  }

  function hasStructure(key) {
    var reg = registry();
    if (!reg) return false;
    return (reg.structures || []).some(function (s) { return s.key === key; });
  }

  // ── Registry lookups the Template Builder and the QA gates use ─────────────

  function entryFor(source) {
    var reg = registry();
    if (!reg) return null;
    var fields = reg.fields || [];
    for (var i = 0; i < fields.length; i += 1) {
      if (fields[i].source === source || fields[i].subjectSource === source) {
        return fields[i];
      }
    }
    return null;
  }

  function aliasFor(source) {
    var reg = registry();
    if (!reg) return null;
    var aliases = reg.aliases || {};
    return Object.prototype.hasOwnProperty.call(aliases, source)
      ? aliases[source] : null;
  }

  // Is this source something the registry can explain? A production-ready map
  // may only use sources for which this is true.
  function isRegistered(source) {
    if (!source) return false;
    if (source.indexOf('umi.address.') === 0) return true;
    return !!(entryFor(source) || aliasFor(source));
  }

  // The exact UMI name(s) behind a source, for documentation and the builder.
  function umiNamesFor(source) {
    var entry = entryFor(source);
    if (entry) return [entry.source];
    var alias = aliasFor(source);
    if (!alias || !alias.umi) return [];
    if (typeof alias.umi === 'string') return [alias.umi];
    if (Array.isArray(alias.umi)) return alias.umi.slice();
    return Object.keys(alias.umi).map(function (k) { return alias.umi[k]; });
  }

  Adapter.resolve = resolve;
  Adapter.entryFor = entryFor;
  Adapter.aliasFor = aliasFor;
  Adapter.isRegistered = isRegistered;
  Adapter.umiNamesFor = umiNamesFor;
  Adapter.formatAddress = formatAddress;
  Adapter.ADDRESS_ORDER = ADDRESS_ORDER;

  ns.umiAdapter = Adapter;

}(typeof window !== 'undefined' ? window : this));
