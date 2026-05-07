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
    var searchInput      = document.querySelector('[data-filter="report-search"]');
    var clientCodeInput  = document.querySelector('[data-filter="report-client-code"]');
    var dateFromInput    = document.querySelector('[data-filter="report-date-from"]');
    var dateToInput      = document.querySelector('[data-filter="report-date-to"]');
    var reportTypeFilter = document.querySelector('[data-filter="report-type"]');
    var statusFilter     = document.querySelector('[data-filter="report-status"]');
    var channelFilter    = document.querySelector('[data-filter="report-channel"]');
    var listWrap         = document.querySelector('[data-entity="mo-report-list"]');
    var listEmptyEl      = document.querySelector('[data-entity="mo-report-list-empty"]');
    var paginationEl     = document.querySelector('[data-role="mo-report-pagination"]');
    var pageSizeButtons  = paginationEl ? Array.prototype.slice.call(paginationEl.querySelectorAll('[data-page-size-value]')) : [];
    var prevButton       = paginationEl ? paginationEl.querySelector('[data-pagination-nav="prev"]') : null;
    var nextButton       = paginationEl ? paginationEl.querySelector('[data-pagination-nav="next"]') : null;
    var pageIndicator    = paginationEl ? paginationEl.querySelector('[data-pagination-indicator]') : null;
    var items            = listWrap ? Array.prototype.slice.call(listWrap.querySelectorAll('.crm-mo-report-item')) : [];
    var pageSize         = 10;
    var currentPage      = 1;

    function selectReport(item) {
      if (!item) return;
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
          else if (val === 'Не доставлен') el.classList.add('crm-mo-status-warn');
          else if (val === 'На проверке') el.classList.add('crm-mo-status-info');
          else if (val === 'Запланирован') el.classList.add('crm-mo-status-muted');
        }
      });
    }

    function clearDetails() {
      detailKeys.forEach(function (key) {
        var el = document.querySelector('[data-detail="' + key + '"]');
        if (!el) return;
        el.textContent = key === 'title' ? 'Отчёт не выбран' : 'Нет данных';
        if (key === 'status') el.className = 'crm-mo-detail-field-value';
      });
    }

    function getFilters() {
      return {
        search: searchInput ? searchInput.value.trim().toLowerCase() : '',
        clientCode: clientCodeInput ? clientCodeInput.value.trim().toLowerCase() : '',
        dateFrom: dateFromInput ? dateFromInput.value : '',
        dateTo: dateToInput ? dateToInput.value : '',
        reportType: reportTypeFilter ? reportTypeFilter.value : 'all',
        status: statusFilter ? statusFilter.value : 'all',
        channel: channelFilter ? channelFilter.value : 'all'
      };
    }

    function getItemDate(item) {
      var date = item.getAttribute('data-date') || '';
      return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : '';
    }

    function itemMatchesFilters(item, filters) {
      var searchText = [
        item.getAttribute('data-client') || '',
        item.getAttribute('data-client-code') || '',
        item.getAttribute('data-report-title') || '',
        item.getAttribute('data-file-name') || '',
        item.getAttribute('data-address') || '',
        item.getAttribute('data-contract') || ''
      ].join(' ').toLowerCase();

      var itemCode = (item.getAttribute('data-client-code') || '').toLowerCase();
      var itemType = item.getAttribute('data-report-type') || '';
      var itemStatus = item.getAttribute('data-status') || '';
      var itemChannel = item.getAttribute('data-channel') || '';
      var itemDate = getItemDate(item);

      if (filters.search && searchText.indexOf(filters.search) === -1) return false;
      if (filters.clientCode && itemCode.indexOf(filters.clientCode) === -1) return false;
      if (filters.reportType !== 'all' && itemType !== filters.reportType) return false;
      if (filters.status !== 'all' && itemStatus !== filters.status) return false;
      if (filters.channel !== 'all' && itemChannel !== filters.channel) return false;
      if (filters.dateFrom && (!itemDate || itemDate < filters.dateFrom)) return false;
      if (filters.dateTo && (!itemDate || itemDate > filters.dateTo)) return false;

      return true;
    }

    function getFilteredItems() {
      return items.filter(function (item) {
        return !item.classList.contains('is-filter-hidden');
      });
    }

    function updatePagination() {
      var filteredItems = getFilteredItems();
      var totalPages = filteredItems.length ? Math.ceil(filteredItems.length / pageSize) : 0;
      var pagedItems = [];

      if (totalPages === 0) {
        currentPage = 0;
      } else {
        if (currentPage < 1) currentPage = 1;
        if (currentPage > totalPages) currentPage = totalPages;

        var start = (currentPage - 1) * pageSize;
        pagedItems = filteredItems.slice(start, start + pageSize);
      }

      items.forEach(function (item) {
        var filterHidden = item.classList.contains('is-filter-hidden');
        var pageHidden = !filterHidden && pagedItems.indexOf(item) === -1;

        item.classList.toggle('is-page-hidden', pageHidden);
        item.hidden = filterHidden || pageHidden;
      });

      if (listEmptyEl) listEmptyEl.hidden = filteredItems.length > 0;
      if (pageIndicator) pageIndicator.textContent = totalPages ? currentPage + ' из ' + totalPages : '0 из 0';
      if (prevButton) prevButton.disabled = totalPages === 0 || currentPage <= 1;
      if (nextButton) nextButton.disabled = totalPages === 0 || currentPage >= totalPages;

      pageSizeButtons.forEach(function (button) {
        button.classList.toggle('is-active', Number(button.getAttribute('data-page-size-value')) === pageSize);
      });

      syncActiveReport(pagedItems);
    }

    function syncActiveReport(visibleItems) {
      var active = items.filter(function (item) {
        return item.classList.contains('is-active');
      })[0];

      if (active && visibleItems.indexOf(active) !== -1) return;

      items.forEach(function (item) {
        item.classList.remove('is-active');
      });

      if (visibleItems.length) selectReport(visibleItems[0]);
      else clearDetails();
    }

    function applyReportFilters(resetPage) {
      var filters = getFilters();
      if (resetPage) currentPage = 1;

      items.forEach(function (item) {
        var isHidden = !itemMatchesFilters(item, filters);
        item.classList.toggle('is-filter-hidden', isHidden);
      });

      updatePagination();
    }

    function resetReportFilters() {
      if (searchInput) searchInput.value = '';
      if (clientCodeInput) clientCodeInput.value = '';
      if (dateFromInput) dateFromInput.value = '';
      if (dateToInput) dateToInput.value = '';
      if (reportTypeFilter) reportTypeFilter.value = 'all';
      if (statusFilter) statusFilter.value = 'all';
      if (channelFilter) channelFilter.value = 'all';
      currentPage = 1;
      applyReportFilters(false);
    }

    function csvEscape(value) {
      var text = String(value || '').replace(/\s+/g, ' ').trim();
      if (text.indexOf(';') !== -1 || text.indexOf('"') !== -1 || text.indexOf('\n') !== -1 || text.indexOf('\r') !== -1) {
        text = '"' + text.replace(/"/g, '""') + '"';
      }
      return text;
    }

    function exportVisibleReports(exportBtn) {
      var columns = [
        { label: 'Клиент', attr: 'data-client' },
        { label: 'Код клиента', attr: 'data-client-code' },
        { label: 'Отчёт', attr: 'data-report-title' },
        { label: 'Тип', attr: 'data-report-type' },
        { label: 'Период', attr: 'data-period' },
        { label: 'Канал', attr: 'data-channel' },
        { label: 'Статус', attr: 'data-status' },
        { label: 'Время отправки', attr: 'data-sent-at' },
        { label: 'Адрес', attr: 'data-address' },
        { label: 'Договор', attr: 'data-contract' },
        { label: 'Сформировал', attr: 'data-created-by' },
        { label: 'Файл', attr: 'data-file-name' },
        { label: 'Размер', attr: 'data-file-size' }
      ];
      var visibleItems = items.filter(function (item) { return !item.hidden; });
      var lines = [
        columns.map(function (column) { return csvEscape(column.label); }).join(';')
      ];
      var filename = (exportBtn.getAttribute('data-export-filename') || 'middle-office-reports.csv').trim();

      visibleItems.forEach(function (item) {
        lines.push(columns.map(function (column) {
          return csvEscape(item.getAttribute(column.attr) || '');
        }).join(';'));
      });

      if (!/\.csv$/i.test(filename)) filename += '.csv';

      exportBtn.disabled = true;
      exportBtn.setAttribute('aria-busy', 'true');

      var blob = new Blob(['\uFEFF' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
      var url = URL.createObjectURL(blob);
      var link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      exportBtn.disabled = false;
      exportBtn.setAttribute('aria-busy', 'false');
      showToast('CSV-экспорт выполнен');
    }

    function bindFilter(el, eventName) {
      if (!el) return;
      el.addEventListener(eventName, function () {
        applyReportFilters(true);
      });
    }

    bindFilter(searchInput, 'input');
    bindFilter(clientCodeInput, 'input');
    bindFilter(dateFromInput, 'change');
    bindFilter(dateFromInput, 'input');
    bindFilter(dateToInput, 'change');
    bindFilter(dateToInput, 'input');
    bindFilter(reportTypeFilter, 'change');
    bindFilter(statusFilter, 'change');
    bindFilter(channelFilter, 'change');

    pageSizeButtons.forEach(function (button) {
      button.addEventListener('click', function () {
        var value = Number(button.getAttribute('data-page-size-value'));
        if (!value || value === pageSize) return;
        pageSize = value;
        currentPage = 1;
        updatePagination();
      });
    });

    if (prevButton) {
      prevButton.addEventListener('click', function () {
        if (currentPage > 1) {
          currentPage -= 1;
          updatePagination();
        }
      });
    }

    if (nextButton) {
      nextButton.addEventListener('click', function () {
        var filteredItems = getFilteredItems();
        var totalPages = filteredItems.length ? Math.ceil(filteredItems.length / pageSize) : 0;
        if (currentPage < totalPages) {
          currentPage += 1;
          updatePagination();
        }
      });
    }

    document.addEventListener('click', function (e) {
      var target = e.target;
      if (!(target instanceof Element)) return;
      var exportBtn = target.closest('[data-action="export-table-csv"]');
      if (!exportBtn) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      exportVisibleReports(exportBtn);
    }, true);

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

      if (e.target.closest('[data-action="reset-mo-report-filters"]')) {
        resetReportFilters();
        return;
      }
    });

    applyReportFilters(false);
  }
})();
