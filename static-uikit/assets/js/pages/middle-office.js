(function () {
  'use strict';

  var page = document.body.getAttribute('data-page');
  if (page !== 'middle-office-clients' && page !== 'middle-office-reports') return;

  /* ── Toast ─────────────────────────────────────────────────────────── */
  var toastEl = document.querySelector('[data-entity="mo-toast"]');
  var toastTimer = null;

  function showToast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toastEl.classList.remove('is-visible');
    }, 2400);
  }

  /* ── Clients Journal ────────────────────────────────────────────────── */
  if (page === 'middle-office-clients') {
    initClientsPage();
  }

  /* ── Reports Journal ────────────────────────────────────────────────── */
  if (page === 'middle-office-reports') {
    initReportsPage();
  }

  /* ================================================================== */
  function initClientsPage() {
    var searchInput  = document.querySelector('[data-filter="search"]');
    var typeFilter   = document.querySelector('[data-filter="client-type"]');
    var kindFilter   = document.querySelector('[data-filter="contract-kind"]');
    var statusFilter = document.querySelector('[data-filter="account-status"]');
    var tbody        = document.querySelector('[data-role="mo-clients-tbody"]');
    var emptyEl      = document.querySelector('[data-entity="mo-clients-empty"]');
    var rows         = tbody ? Array.prototype.slice.call(tbody.querySelectorAll('tr')) : [];

    function applyFilters() {
      var search = searchInput  ? searchInput.value.trim().toLowerCase() : '';
      var type   = typeFilter   ? typeFilter.value   : 'all';
      var kind   = kindFilter   ? kindFilter.value   : 'all';
      var status = statusFilter ? statusFilter.value : 'all';

      var visible = 0;
      rows.forEach(function (row) {
        var text    = (row.getAttribute('data-search-text') || '').toLowerCase();
        var rowType = row.getAttribute('data-client-type') || '';
        var rowKind = row.getAttribute('data-contract-kind') || '';
        var rowStat = row.getAttribute('data-account-status') || '';

        var show = true;
        if (search && text.indexOf(search) === -1) show = false;
        if (type   !== 'all' && rowType !== type)  show = false;
        if (kind   !== 'all' && rowKind !== kind)  show = false;
        if (status !== 'all' && rowStat !== status) show = false;

        row.hidden = !show;
        if (show) visible++;
      });

      if (emptyEl) emptyEl.hidden = visible > 0;
    }

    if (searchInput)  searchInput.addEventListener('input', applyFilters);
    if (typeFilter)   typeFilter.addEventListener('change', applyFilters);
    if (kindFilter)   kindFilter.addEventListener('change', applyFilters);
    if (statusFilter) statusFilter.addEventListener('change', applyFilters);

    document.addEventListener('click', function (e) {
      if (e.target.closest('[data-action="reset-mo-clients-filters"]')) {
        if (searchInput)  searchInput.value  = '';
        if (typeFilter)   typeFilter.value   = 'all';
        if (kindFilter)   kindFilter.value   = 'all';
        if (statusFilter) statusFilter.value = 'all';
        applyFilters();
        return;
      }

      if (e.target.closest('[data-action="export-mo-clients"]')) {
        showToast('CSV-экспорт выполнен');
        return;
      }

      var row = e.target.closest('[data-role="mo-clients-tbody"] tr[data-href]');
      if (row) {
        window.location.href = row.getAttribute('data-href');
      }
    });
  }

  /* ================================================================== */
  function initReportsPage() {
    var searchInput  = document.querySelector('[data-filter="report-search"]');
    var statusFilter = document.querySelector('[data-filter="report-status"]');
    var channelFilter = document.querySelector('[data-filter="report-channel"]');
    var listWrap     = document.querySelector('[data-entity="mo-report-list"]');
    var listEmptyEl  = document.querySelector('[data-entity="mo-report-list-empty"]');
    var items        = listWrap ? Array.prototype.slice.call(listWrap.querySelectorAll('.crm-mo-report-item')) : [];

    function applyReportFilters() {
      var search  = searchInput   ? searchInput.value.trim().toLowerCase() : '';
      var status  = statusFilter  ? statusFilter.value  : 'all';
      var channel = channelFilter ? channelFilter.value : 'all';

      var firstVisible = null;
      var activeStillVisible = false;

      items.forEach(function (item) {
        var text = [
          item.getAttribute('data-client')       || '',
          item.getAttribute('data-client-code')  || '',
          item.getAttribute('data-report-title') || '',
          item.getAttribute('data-file-name')    || ''
        ].join(' ').toLowerCase();

        var itemStatus  = item.getAttribute('data-status')  || '';
        var itemChannel = item.getAttribute('data-channel') || '';

        var show = true;
        if (search  && text.indexOf(search) === -1)     show = false;
        if (status  !== 'all' && itemStatus  !== status)  show = false;
        if (channel !== 'all' && itemChannel !== channel) show = false;

        item.hidden = !show;

        if (show) {
          if (!firstVisible) firstVisible = item;
          if (item.classList.contains('is-active')) activeStillVisible = true;
        }
      });

      if (listEmptyEl) listEmptyEl.hidden = firstVisible !== null;

      if (!activeStillVisible && firstVisible) {
        selectReport(firstVisible);
      }
    }

    function selectReport(item) {
      items.forEach(function (i) { i.classList.remove('is-active'); });
      item.classList.add('is-active');
      updateDetails(item);
    }

    var detailKeys = [
      'title', 'client', 'client-code', 'report-type', 'period',
      'channel', 'status', 'sent-at', 'address', 'contract',
      'created-by', 'file-name', 'file-size'
    ];

    function updateDetails(item) {
      detailKeys.forEach(function (key) {
        var el = document.querySelector('[data-detail="' + key + '"]');
        if (!el) return;
        var dataAttr = key === 'title' ? 'data-report-title' : 'data-' + key;
        var val = item.getAttribute(dataAttr) || '';
        el.textContent = val;

        if (key === 'status') {
          el.className = 'crm-mo-detail-field-value';
          if (val === 'Доставлен') el.classList.add('crm-mo-status-ok');
          else if (val === 'Ошибка') el.classList.add('crm-mo-status-error');
        }
      });
    }

    if (searchInput)   searchInput.addEventListener('input', applyReportFilters);
    if (statusFilter)  statusFilter.addEventListener('change', applyReportFilters);
    if (channelFilter) channelFilter.addEventListener('change', applyReportFilters);

    document.addEventListener('click', function (e) {
      var item = e.target.closest('.crm-mo-report-item');
      if (item && !item.hidden) {
        selectReport(item);
        return;
      }

      if (e.target.closest('[data-action="resend-report"]')) {
        showToast('Отчёт отправлен повторно');
        return;
      }

      if (e.target.closest('[data-action="download-report"]')) {
        showToast('Файл подготовлен к скачиванию');
        return;
      }

      if (e.target.closest('[data-action="export-mo-reports"]')) {
        showToast('CSV-экспорт выполнен');
        return;
      }
    });
  }
})();
