(function (global) {
  'use strict';
  var engine = global.CRMDocumentEngine = global.CRMDocumentEngine || {};
  engine.orderMap = {
    slot: function (id, source, label, page, left, baselineTop, width, options) {
      return Object.assign({ id: id, source: source, label: label, page: page,
        left: left, baselineTop: baselineTop, width: width, font: 'legalSerif',
        fontSize: 10, minFontSize: 9, optional: !(options && options.required) }, options);
    },
    mark: function (id, source, equals, label, page, left, baselineTop, glyphSize) {
      var field = { id: id, type: 'check', source: source, label: label, page: page,
        left: left, baselineTop: baselineTop, glyphSize: glyphSize, optional: true };
      if (equals !== null) field.equals = equals;
      return field;
    },
    cashParagraph: function (id, frame, text, runs, replacement, options) {
      return Object.assign({
        id: id, type: 'wordFlowBlock', page: 0, frame: frame,
        font: 'legalSerif', fontSize: 9, minFontSize: 9, fontSizeLocked: true,
        lineHeight: 10.5, alignment: 'left', sourceStaticText: text, runs: runs,
        sourceReplacement: replacement
      }, options);
    },
    register: function (template) {
      template.orderDocument = true;
      engine.fieldMaps = engine.fieldMaps || {};
      engine.fieldMaps[template.id] = template;
    }
  };
}(window));
