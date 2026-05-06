(function () {
  const app = document.querySelector('.crm-app');
  const toggle = document.querySelector('[data-sidebar-toggle]');
  const sidebar = document.querySelector('.crm-sidebar');

  // ── Selectable controls / radio tiles / check rows ──────────────────────
  function syncOptionGridState(scope) {
    scope.querySelectorAll('.crm-option-grid').forEach(function (group) {
      group.querySelectorAll('.crm-option-card').forEach(function (card) {
        const radio = card.querySelector('input[type="radio"]');
        card.classList.toggle('is-selected', !!(radio && radio.checked));
      });
    });
  }

  function syncBinaryPills(scope) {
    scope.querySelectorAll('.crm-binary-control').forEach(function (binaryGroup) {
      binaryGroup.querySelectorAll('label').forEach(function (pill) {
        const radio = pill.querySelector('input[type="radio"]');
        pill.classList.toggle('is-active', !!(radio && radio.checked));
      });
    });
  }
  function escapeCssValue(value) {
    if (window.CSS && typeof window.CSS.escape === 'function') return window.CSS.escape(value);
    return String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  }

  function findControlScope(element) {
    return element.closest('form, fieldset, section, .crm-card, .crm-page') || document;
  }

  function getAuthErrorNode(control) {
    if (!control || !control.id) return null;
    return document.querySelector('[data-auth-error-for="' + escapeCssValue(control.id) + '"]');
  }

  // ── Auth validation ──────────────────────────────────────────────────────
  // Hook contract: form[data-auth-form], [data-auth-required], [data-auth-error-for="<id>"], [data-auth-alert]
  function setAuthControlValidState(control, isValid) {
    if (!control) return;
    const errorNode = getAuthErrorNode(control);
    const controlId = control.id || '';

    control.classList.toggle('is-invalid', !isValid);
    control.setAttribute('aria-invalid', isValid ? 'false' : 'true');

    if (!isValid && errorNode && controlId) {
      errorNode.hidden = false;
      errorNode.id = errorNode.id || (controlId + '-error');
      control.setAttribute('aria-describedby', errorNode.id);
    } else {
      if (errorNode) errorNode.hidden = true;
      control.removeAttribute('aria-describedby');
    }

    if (control.type === 'checkbox') {
      const checkLabel = control.closest('.crm-auth-check');
      if (checkLabel) checkLabel.classList.toggle('is-invalid', !isValid);
    }
  }

  function validateAuthForm(form) {
    if (!form || !form.matches('[data-auth-form]')) return true;

    let hasErrors = false;
    form.querySelectorAll('[data-auth-required]').forEach(function (control) {
      const isCheckbox = control instanceof HTMLInputElement && control.type === 'checkbox';
      const value = isCheckbox ? '' : (control.value || '').trim();
      const isValid = isCheckbox ? control.checked : value.length > 0;
      setAuthControlValidState(control, isValid);
      if (!isValid) hasErrors = true;
    });

    const authAlert = form.querySelector('[data-auth-alert]');
    if (authAlert) authAlert.hidden = !hasErrors;

    return !hasErrors;
  }

  function syncRadioTileGroup(scope, radioName) {
    if (!radioName) return;
    scope.querySelectorAll('.crm-radio-tile input[type="radio"][name="' + escapeCssValue(radioName) + '"]').forEach(function (radio) {
      const tile = radio.closest('.crm-radio-tile');
      if (tile) {
        tile.classList.toggle('is-selected', radio.checked);
      }
    });
  }

  function syncSelectableControlState(scope) {
    scope.querySelectorAll('.crm-radio-tile').forEach(function (tile) {
      const radio = tile.querySelector('input[type="radio"]');
      tile.classList.toggle('is-selected', !!(radio && radio.checked));
    });

    scope.querySelectorAll('.crm-check-row').forEach(function (row) {
      const input = row.querySelector('input[type="checkbox"], input[type="radio"]');
      row.classList.toggle('is-active', !!(input && input.checked));
    });
  }

  // ── Filter menus and static table filters ───────────────────────────────
  // Hook contract: .crm-filter-panel, [data-filter="<key>"], [data-filter-option][data-filter-value],
  //   tbody tr[data-filter-<key>="<value>"], [data-action="reset-filters"]
  function getFilterOptionText(option) {
    if (!option) return '';
    const selectedTextNode = option.querySelector('span');
    return selectedTextNode ? selectedTextNode.textContent.trim() : option.textContent.trim();
  }

  function closeOpenFilterMenus(exceptMenu) {
    document.querySelectorAll('.crm-filter-menu[open]').forEach(function (menu) {
      if (menu !== exceptMenu) {
        menu.removeAttribute('open');
      }
    });
  }

  function getFilterPanelOwner(filterMenu) {
    if (!filterMenu) return null;
    return filterMenu.closest('.crm-registry-filters.crm-filter-panel, .crm-filter-panel');
  }

  function syncFilterPanelMenuState(panel) {
    if (!panel) return;
    const hasOpenMenu = !!panel.querySelector('.crm-filter-menu[open]');
    panel.classList.toggle('is-filter-menu-open', hasOpenMenu);
  }

  function normalizeFilterValue(value) {
    return String(value || '').replace(/\s+/g, ' ').trim().toLowerCase();
  }

  function normalizeFilterKey(value) {
    return normalizeFilterValue(value).replace(/[^a-z0-9_-]+/g, '-');
  }

  function isEmptyFilterValue(value) {
    const normalized = normalizeFilterValue(value);
    return normalized === '' || normalized === 'all' || normalized === '\u0432\u0441\u0435';
  }

  function getStaticFilterLabel(field, value) {
    const menu = field ? field.closest('.crm-filter-menu') : null;
    let option = null;
    if (menu) {
      option = menu.querySelector('.crm-filter-option[data-filter-option][data-filter-value="' + escapeCssValue(value) + '"]');
    }

    if (!option && field instanceof HTMLSelectElement) {
      option = field.selectedOptions && field.selectedOptions[0];
    }

    return option ? getFilterOptionText(option) : '';
  }

  function getStaticFilterFieldKey(field) {
    if (!field) return '';
    if (field.hasAttribute('data-filter-search')) return 'search';
    return field.getAttribute('data-filter') || field.getAttribute('name') || field.getAttribute('id') || '';
  }

  function getStaticFilterTarget(panel) {
    if (!panel) return null;
    const shell = panel.closest('.crm-registry-shell, .crm-registry-page, .crm-page') || panel.parentElement || document;
    const tables = Array.from(shell.querySelectorAll('.crm-registry-table table, table[data-sortable-table], table'));
    for (let index = 0; index < tables.length; index += 1) {
      if ((panel.compareDocumentPosition(tables[index]) & Node.DOCUMENT_POSITION_FOLLOWING) && tables[index].querySelector('tbody tr')) {
        return { shell: shell, table: tables[index] };
      }
    }

    const fallbackTable = shell.querySelector('.crm-registry-table table, table[data-sortable-table], table');
    return fallbackTable ? { shell: shell, table: fallbackTable } : null;
  }

  function getStaticFilterRows(table) {
    if (!table || !table.tBodies || !table.tBodies.length) return [];
    return Array.from(table.tBodies[0].querySelectorAll(':scope > tr:not([data-sort-ignore])'));
  }

  function getStaticEmptyState(shell, panel) {
    if (!shell) return null;
    const states = Array.from(shell.querySelectorAll('.crm-registry-empty, .crm-empty-state, [data-entity="empty-state"]'));
    for (let index = 0; index < states.length; index += 1) {
      if (!panel || !panel.contains(states[index])) return states[index];
    }
    return null;
  }

  function collectStaticFilterCriteria(panel) {
    const criteria = [];
    if (!panel) return criteria;

    panel.querySelectorAll('input, select, textarea').forEach(function (field) {
      if (field.disabled) return;

      const type = (field.type || '').toLowerCase();
      if (type === 'button' || type === 'submit' || type === 'reset') return;
      if ((type === 'checkbox' || type === 'radio') && !field.checked) return;

      const key = getStaticFilterFieldKey(field);
      const rawValue = type === 'checkbox' || type === 'radio' ? field.value : field.value;
      const value = normalizeFilterValue(rawValue);
      const isSearch = key === 'search' || type === 'search' || field.hasAttribute('data-filter-search');
      const isDate = type === 'date' || /(^|-)date($|-)|(^|-)period($|-)/.test(normalizeFilterKey(key));

      if (isSearch) {
        if (value) criteria.push({ type: 'search', key: key, value: value });
        return;
      }

      if (isDate) {
        if (value && isFieldDirty(field)) {
          criteria.push({ type: 'date', key: key, value: value });
        }
        return;
      }

      if (isEmptyFilterValue(value)) return;

      criteria.push({
        type: 'value',
        key: key,
        value: value,
        label: normalizeFilterValue(getStaticFilterLabel(field, rawValue))
      });
    });

    return criteria;
  }

  function rowTokenMatches(sourceValue, expectedValue) {
    const normalizedSource = normalizeFilterValue(sourceValue);
    if (!normalizedSource) return false;
    if (normalizedSource === expectedValue) return true;
    return normalizedSource.split(/[\s,;|]+/).indexOf(expectedValue) !== -1;
  }

  function getRowFilterAttributeValues(row, key, criterionType) {
    const normalizedKey = normalizeFilterKey(key);
    const suffix = normalizedKey.split('-').filter(Boolean).pop() || normalizedKey;
    const attributes = [
      'data-filter-' + normalizedKey,
      'data-' + normalizedKey,
      'data-' + suffix
    ];

    if (criterionType === 'date' || normalizedKey.indexOf('date') !== -1) attributes.push('data-date');
    if (normalizedKey.indexOf('status') !== -1) attributes.push('data-status');
    if (normalizedKey.indexOf('type') !== -1) attributes.push('data-type');
    if (normalizedKey.indexOf('result') !== -1) attributes.push('data-result');
    if (normalizedKey.indexOf('risk') !== -1) attributes.push('data-risk');
    if (normalizedKey.indexOf('category') !== -1) attributes.push('data-category');
    if (normalizedKey.indexOf('manager') !== -1) attributes.push('data-manager');
    if (normalizedKey.indexOf('assignee') !== -1) attributes.push('data-assignee');
    if (normalizedKey.indexOf('source') !== -1) attributes.push('data-source');
    if (normalizedKey.indexOf('channel') !== -1) attributes.push('data-channel');

    const values = [];
    attributes.forEach(function (attribute) {
      const value = row.getAttribute(attribute);
      if (value != null) values.push(value);
    });

    const descendantSelector = attributes.map(function (attribute) {
      return '[' + attribute + ']';
    }).join(',');

    if (descendantSelector) {
      row.querySelectorAll(descendantSelector).forEach(function (node) {
        attributes.forEach(function (attribute) {
          const value = node.getAttribute(attribute);
          if (value != null) values.push(value);
        });
      });
    }

    return values;
  }

  function rowMatchesStaticCriterion(row, criterion) {
    if (criterion.type === 'search') {
      return normalizeFilterValue(row.textContent).indexOf(criterion.value) !== -1;
    }

    const rowValues = getRowFilterAttributeValues(row, criterion.key, criterion.type);
    for (let index = 0; index < rowValues.length; index += 1) {
      if (rowTokenMatches(rowValues[index], criterion.value)) return true;
    }

    if (criterion.type === 'date') {
      return false;
    }

    if (criterion.value.indexOf('opt-') === 0 && criterion.label) {
      return normalizeFilterValue(row.textContent).indexOf(criterion.label) !== -1;
    }

    return false;
  }

  function applyStaticFilters(scope) {
    getFilterPanels(scope || document).forEach(function (panel) {
      if (!panel.matches('.crm-registry-filters')) return;

      const target = getStaticFilterTarget(panel);
      if (!target) return;

      const rows = getStaticFilterRows(target.table);
      if (!rows.length) return;

      const criteria = collectStaticFilterCriteria(panel);
      let visibleCount = 0;

      rows.forEach(function (row) {
        const isVisible = criteria.every(function (criterion) {
          return rowMatchesStaticCriterion(row, criterion);
        });
        row.hidden = !isVisible;
        row.classList.toggle('is-filter-hidden', !isVisible);
        if (isVisible) visibleCount += 1;
      });

      const emptyState = getStaticEmptyState(target.shell, panel);
      if (emptyState) emptyState.hidden = visibleCount > 0;

      refreshPaginationForTable(target.table, true);
    });
  }

  // ── Client-side demo pagination ──────────────────────────────────────────────
  // Static-only demo behavior. UMI.CMS will replace with server-side pagination.
  // Registry tables with a [data-page-size-group] footer get per-page row slicing.
  // Filter state: .is-filter-hidden. Pagination state: .is-page-hidden. row.hidden = either.

  var paginationInstances = [];

  function getPaginationFilteredRows(table) {
    if (!table || !table.tBodies || !table.tBodies.length) return [];
    return Array.from(
      table.tBodies[0].querySelectorAll(':scope > tr:not([data-sort-ignore])')
    ).filter(function (row) {
      return !row.classList.contains('is-filter-hidden');
    });
  }

  function applyPagination(instance) {
    if (!instance || !instance.table) return;
    var tbody = instance.table.tBodies && instance.table.tBodies[0];
    if (!tbody) return;

    var allRows = Array.from(tbody.querySelectorAll(':scope > tr:not([data-sort-ignore])'));
    var filteredRows = allRows.filter(function (row) {
      return !row.classList.contains('is-filter-hidden');
    });

    var pageSize = instance.pageSize;
    var totalPages = filteredRows.length > 0 ? Math.ceil(filteredRows.length / pageSize) : 1;

    if (instance.currentPage > totalPages) instance.currentPage = totalPages;
    if (instance.currentPage < 1) instance.currentPage = 1;
    var currentPage = instance.currentPage;

    var startIndex = (currentPage - 1) * pageSize;
    var endIndex = startIndex + pageSize;

    filteredRows.forEach(function (row, i) {
      var hide = i < startIndex || i >= endIndex;
      row.classList.toggle('is-page-hidden', hide);
      row.hidden = hide;
    });

    allRows.forEach(function (row) {
      if (row.classList.contains('is-filter-hidden')) {
        row.classList.remove('is-page-hidden');
        row.hidden = true;
      }
    });

    if (instance.indicator) {
      instance.indicator.textContent = filteredRows.length === 0
        ? '0 из 0'
        : currentPage + ' из ' + totalPages;
    }

    var canPrev = currentPage > 1;
    var canNext = filteredRows.length > 0 && currentPage < totalPages;

    if (instance.prevBtn) {
      instance.prevBtn.disabled = !canPrev;
      instance.prevBtn.setAttribute('aria-disabled', canPrev ? 'false' : 'true');
      instance.prevBtn.classList.toggle('is-disabled', !canPrev);
    }
    if (instance.nextBtn) {
      instance.nextBtn.disabled = !canNext;
      instance.nextBtn.setAttribute('aria-disabled', canNext ? 'false' : 'true');
      instance.nextBtn.classList.toggle('is-disabled', !canNext);
    }
  }

  function refreshPaginationForTable(table, resetPage) {
    paginationInstances.forEach(function (instance) {
      if (instance.table === table) {
        if (resetPage) instance.currentPage = 1;
        applyPagination(instance);
      }
    });
  }

  function initPagination() {
    paginationInstances = [];

    document.querySelectorAll('[data-page-size-group]').forEach(function (pageGroup) {
      var shell = pageGroup.closest('.crm-registry-shell, .crm-registry-page, .crm-page') || pageGroup.parentElement;
      if (!shell) return;

      var table = null;
      var tables = Array.from(shell.querySelectorAll('.crm-registry-table table, table[data-sortable-table], table'));
      for (var ti = 0; ti < tables.length; ti++) {
        var tb = tables[ti].tBodies && tables[ti].tBodies[0];
        if (tb && tb.querySelectorAll(':scope > tr:not([data-sort-ignore])').length > 0) {
          table = tables[ti];
          break;
        }
      }
      if (!table) return;

      var footerDiv = pageGroup.parentElement;
      var indicator = null;
      if (footerDiv) {
        var candidates = Array.from(footerDiv.querySelectorAll('span, td'));
        for (var ci = 0; ci < candidates.length; ci++) {
          if (/^\d+\s+из\s+\d+$/.test(candidates[ci].textContent.trim())) {
            indicator = candidates[ci];
            break;
          }
        }
      }

      var prevBtn = null;
      var nextBtn = null;
      if (footerDiv) {
        Array.from(footerDiv.querySelectorAll('button[aria-label]')).forEach(function (btn) {
          var label = btn.getAttribute('aria-label') || '';
          if (!prevBtn && /предыдущ/i.test(label)) prevBtn = btn;
          if (!nextBtn && /следующ/i.test(label)) nextBtn = btn;
        });
      }

      var activeChip = pageGroup.querySelector('.crm-footer-chip.is-active[data-page-size-value]');
      var pageSize = activeChip ? (parseInt(activeChip.getAttribute('data-page-size-value'), 10) || 25) : 25;

      var instance = {
        pageGroup: pageGroup,
        table: table,
        pageSize: pageSize,
        currentPage: 1,
        prevBtn: prevBtn,
        nextBtn: nextBtn,
        indicator: indicator
      };

      paginationInstances.push(instance);
      pageGroup._paginationInst = instance;

      if (prevBtn) {
        prevBtn.setAttribute('data-pagination-nav', 'prev');
        prevBtn._paginationInst = instance;
      }
      if (nextBtn) {
        nextBtn.setAttribute('data-pagination-nav', 'next');
        nextBtn._paginationInst = instance;
      }
    });

    paginationInstances.forEach(applyPagination);
  }

  function syncFilterMenuState(filterMenu, value) {
    if (!filterMenu) return;

    const hiddenInput = filterMenu.querySelector('input[type="hidden"][data-filter]');
    const defaultValue = hiddenInput ? (ensureFilterFieldDefault(hiddenInput) || 'all') : 'all';
    const selectedValue = typeof value === 'string' ? value : (hiddenInput && hiddenInput.value ? hiddenInput.value : defaultValue);

    let selectedOption = filterMenu.querySelector('.crm-filter-option[data-filter-option][data-filter-value="' + escapeCssValue(selectedValue) + '"]');
    if (!selectedOption) {
      selectedOption = filterMenu.querySelector('.crm-filter-option[data-filter-option][data-filter-value="' + escapeCssValue(defaultValue) + '"]');
    }
    if (!selectedOption) {
      selectedOption = filterMenu.querySelector('.crm-filter-option[data-filter-option]');
    }
    if (!selectedOption) return;

    const normalizedValue = selectedOption.getAttribute('data-filter-value') || defaultValue;
    if (hiddenInput) hiddenInput.value = normalizedValue;

    filterMenu.querySelectorAll('.crm-filter-option[data-filter-option]').forEach(function (option) {
      const isSelected = option === selectedOption;
      option.classList.toggle('is-selected', isSelected);
      option.setAttribute('aria-selected', isSelected ? 'true' : 'false');
    });

    const triggerValue = filterMenu.querySelector('.crm-filter-trigger-value');
    const selectedText = getFilterOptionText(selectedOption);
    if (triggerValue && selectedText) triggerValue.textContent = selectedText;
  }

  function applyFilterOptionSelection(filterOption) {
    const filterMenu = filterOption.closest('.crm-filter-menu');
    if (!filterMenu) return;

    const selectedValue = filterOption.getAttribute('data-filter-value') || '';
    syncFilterMenuState(filterMenu, selectedValue);
    filterMenu.removeAttribute('open');
    const panel = getFilterPanelOwner(filterMenu);
    syncFilterPanelMenuState(panel);
    syncResetButtonState(panel || document);
    applyStaticFilters(panel || document);
  }

  function resetFilterMenu(filterMenu) {
    if (!filterMenu) return;
    const hiddenInput = filterMenu.querySelector('input[type="hidden"][data-filter]');
    const defaultValue = hiddenInput ? (ensureFilterFieldDefault(hiddenInput) || 'all') : 'all';
    syncFilterMenuState(filterMenu, defaultValue);
    filterMenu.removeAttribute('open');
  }

  function resetFilterMenus(form) {
    if (!form) return;
    form.querySelectorAll('.crm-filter-menu').forEach(resetFilterMenu);
  }

  function getInitialFilterFieldDefault(field) {
    if (!field) return '';

    const type = (field.type || '').toLowerCase();

    if (type === 'checkbox' || type === 'radio') {
      return field.defaultChecked ? 'checked' : 'unchecked';
    }

    if (type === 'hidden' && field.matches('[data-filter]')) {
      const attributeValue = field.getAttribute('value');
      return attributeValue && attributeValue.trim() ? attributeValue : 'all';
    }

    if (field.hasAttribute('value')) {
      return field.getAttribute('value') || '';
    }

    return field.defaultValue || '';
  }

  function ensureFilterFieldDefault(field) {
    if (!field || !field.dataset) return '';

    if (!Object.prototype.hasOwnProperty.call(field.dataset, 'filterDefaultValue')) {
      field.dataset.filterDefaultValue = getInitialFilterFieldDefault(field);
    }

    return field.dataset.filterDefaultValue;
  }

  function initFilterPanelDefaults(scope) {
    getFilterPanels(scope || document).forEach(function (panel) {
      panel.querySelectorAll('input, select, textarea').forEach(ensureFilterFieldDefault);
    });
  }

  function isFieldDirty(field) {
    if (!field || field.disabled) return false;
    const type = (field.type || '').toLowerCase();
    const defaultValue = ensureFilterFieldDefault(field);

    if (type === 'checkbox' || type === 'radio') {
      const checkedState = field.checked ? 'checked' : 'unchecked';
      return checkedState !== defaultValue;
    }

    return field.value !== defaultValue;
  }

  function isFilterPanelDirty(panel) {
    if (!panel) return false;

    const fields = panel.querySelectorAll('input, select, textarea');
    for (let index = 0; index < fields.length; index += 1) {
      if (isFieldDirty(fields[index])) return true;
    }

    return false;
  }

  function getFilterPanels(scope) {
    if (!scope) return [];

    const panels = [];
    if (scope.matches && scope.matches('.crm-filter-panel')) {
      panels.push(scope);
    }

    scope.querySelectorAll('.crm-filter-panel').forEach(function (panel) {
      panels.push(panel);
    });

    return panels;
  }

  function syncResetButtonState(scope) {
    if (!scope) return;

    getFilterPanels(scope).forEach(function (panel) {
      const isDirty = isFilterPanelDirty(panel);
      panel.querySelectorAll('[data-action="reset-filters"]').forEach(function (button) {
        const isDisabled = !isDirty;
        button.disabled = isDisabled;
        button.classList.toggle('is-disabled', isDisabled);
        button.setAttribute('aria-disabled', isDisabled ? 'true' : 'false');
      });
    });
  }

  // ── Requests create panel ────────────────────────────────────────────────
  // Hook contract: body[data-page="requests"], #request-create-panel or [data-entity="request-create-panel"],
  //   [data-action="toggle-request-create"], [data-action="close-request-create"]
  const REQUEST_CREATE_CLOSED_TEXT = 'Создать поручение';
  const REQUEST_CREATE_OPEN_TEXT = 'Закрыть форму';

  function isRequestsPage() {
    return !!(document.body && document.body.dataset.page === 'requests');
  }

  function getRequestCreatePanel() {
    if (!isRequestsPage()) return null;
    return document.getElementById('request-create-panel') || document.querySelector('[data-entity="request-create-panel"]');
  }

  function getRequestCreateToggle() {
    if (!isRequestsPage()) return null;
    return document.querySelector('[data-action="toggle-request-create"]');
  }

  function setRequestCreatePanelOpen(isOpen, shouldFocus) {
    const panel = getRequestCreatePanel();
    const toggleButton = getRequestCreateToggle();

    if (panel) {
      panel.hidden = !isOpen;
    }

    if (toggleButton) {
      toggleButton.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      toggleButton.textContent = isOpen ? REQUEST_CREATE_OPEN_TEXT : REQUEST_CREATE_CLOSED_TEXT;
    }

    if (isOpen && shouldFocus && panel) {
      const firstControl = panel.querySelector('input:not([type="hidden"]), select, textarea');
      if (firstControl) firstControl.focus();
    }
  }

  function initFilterMenus() {
    document.querySelectorAll('.crm-filter-menu').forEach(function (filterMenu) {
      syncFilterMenuState(filterMenu);
    });
  }

  // ── Sidebar / navigation ─────────────────────────────────────────────────
  const mobileQuery = window.matchMedia('(max-width: 920px)');

  function isMobileViewport() {
    return mobileQuery.matches;
  }

  function closeSidebar() {
    if (app) {
      app.classList.remove('sidebar-open');
    }
  }

  function openSidebar() {
    if (app) {
      app.classList.add('sidebar-open');
    }
  }

  if (toggle && app) {
    toggle.addEventListener('click', function () {
      if (app.classList.contains('sidebar-open')) {
        closeSidebar();
        return;
      }
      openSidebar();
    });
  }

  if (app) {
    const overlay = document.createElement('button');
    overlay.type = 'button';
    overlay.className = 'crm-sidebar-overlay';
    overlay.setAttribute('aria-label', 'Закрыть меню');
    app.appendChild(overlay);

    overlay.addEventListener('click', function () {
      closeSidebar();
    });
  }

  // [data-match] on a nav link is a space-separated list of page filenames that also activate that item.
  const currentPage = (window.location.pathname.split('/').pop() || 'dashboard.html').toLowerCase();
  const navLinks = document.querySelectorAll('.crm-sidebar .crm-nav-link[href]');

  navLinks.forEach(function (link) {
    const href = (link.getAttribute('href') || '').toLowerCase();
    const alias = (link.dataset.match || '').toLowerCase().split(/\s+/).filter(Boolean);
    if (href === currentPage || alias.includes(currentPage)) {
      link.classList.add('active');
    }
  });

  document.querySelectorAll('.crm-nav-group').forEach(function (group) {
    const groupToggle = group.querySelector('.crm-nav-group-toggle');
    const submenu = group.querySelector('.crm-nav-submenu');
    const hasActiveChild = !!group.querySelector('.crm-nav-submenu .crm-nav-link.active');

    function setExpanded(expanded) {
      group.classList.toggle('expanded', expanded);
      group.classList.toggle('active', hasActiveChild);
      if (groupToggle) groupToggle.setAttribute('aria-expanded', expanded ? 'true' : 'false');
      if (submenu) submenu.hidden = !expanded;
    }

    setExpanded(hasActiveChild);

    if (groupToggle) {
      groupToggle.addEventListener('click', function () {
        setExpanded(!group.classList.contains('expanded'));
      });
    }
  });


  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') {
      closeSidebar();
      closeOpenFilterMenus();
    }
  });

  if (mobileQuery.addEventListener) {
    mobileQuery.addEventListener('change', function (event) {
      if (!event.matches) {
        closeSidebar();
      }
    });
  }

  document.addEventListener('click', function (event) {
    if (!app || !sidebar || !isMobileViewport() || !app.classList.contains('sidebar-open')) {
      return;
    }

    const target = event.target;

    if (sidebar.contains(target) || (toggle && toggle.contains(target))) {
      return;
    }

    closeSidebar();
  });

  document.addEventListener('toggle', function (event) {
    const filterMenu = event.target;
    if (!filterMenu || !filterMenu.matches('.crm-filter-menu')) {
      return;
    }
    if (filterMenu.open) {
      closeOpenFilterMenus(filterMenu);
    }
    filterMenu.classList.toggle('is-filter-menu-open', filterMenu.open);
    syncFilterPanelMenuState(getFilterPanelOwner(filterMenu));
  }, true);

  if (sidebar) {
    sidebar.addEventListener('click', function (event) {
      const link = event.target.closest('a[href]');
      if (!link || !isMobileViewport()) {
        return;
      }

      closeSidebar();
    });
  }

  syncOptionGridState(document);
  syncBinaryPills(document);
  syncSelectableControlState(document);

  document.addEventListener('click', function (event) {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const authSubmit = target.closest('[data-auth-form] .crm-auth-submit');
    if (authSubmit) {
      const authForm = authSubmit.closest('[data-auth-form]');
      if (authForm) {
        validateAuthForm(authForm);
        event.preventDefault();
        return;
      }
    }

    if (isRequestsPage()) {
      const requestCreateToggle = target.closest('[data-action="toggle-request-create"]');
      if (requestCreateToggle) {
        const panel = getRequestCreatePanel();
        setRequestCreatePanelOpen(!!(panel && panel.hidden), true);
        event.preventDefault();
        return;
      }

      const requestCreateClose = target.closest('[data-action="close-request-create"]');
      if (requestCreateClose) {
        setRequestCreatePanelOpen(false, false);
        event.preventDefault();
        return;
      }
    }

    // Date field triggers — [data-date-trigger] / [data-date-picker-trigger] open the native date picker.
    const datePickerTrigger = target.closest('[data-date-trigger], [data-date-picker-trigger]');
    if (datePickerTrigger) {
      const inputId = datePickerTrigger.getAttribute('data-date-picker-trigger');
      const dateField = datePickerTrigger.closest('.crm-date-field, .crm-filter-date-control, .crm-dep-date-wrap');
      let input = inputId ? document.getElementById(inputId) : null;

      if (!(input instanceof HTMLInputElement) && dateField) {
        input = dateField.querySelector('[data-date-input], input[type="date"]');
      }

      if (input instanceof HTMLInputElement) {
        try {
          if (typeof input.showPicker === 'function') {
            input.showPicker();
          } else {
            input.focus();
            input.click();
          }
        } catch (error) {
          input.focus();
          input.click();
        }
      }

      event.preventDefault();
      return;
    }

    const resetButton = target.closest('[data-action="reset-filters"]');
    if (resetButton) {
      const form = resetButton.closest('form');
      if (form) {
        form.reset();
        resetFilterMenus(form);
        closeOpenFilterMenus();
        form.querySelectorAll('.crm-filter-panel').forEach(syncFilterPanelMenuState);
        syncOptionGridState(form);
        syncBinaryPills(form);
        syncSelectableControlState(form);
        syncResetButtonState(form);
        applyStaticFilters(form);
      }
      event.preventDefault();
      return;
    }



    // Footer chips — [data-page-size-group] manages mutually exclusive .crm-footer-chip selection.
    const pageSizeChip = target.closest('[data-page-size-group] .crm-footer-chip');
    if (pageSizeChip) {
      const chipGroup = pageSizeChip.closest('[data-page-size-group]');
      if (chipGroup) {
        chipGroup.querySelectorAll('.crm-footer-chip').forEach(function (chip) {
          const isActive = chip === pageSizeChip;
          chip.classList.toggle('is-active', isActive);
          chip.setAttribute('aria-pressed', isActive ? 'true' : 'false');
        });
        var newPageSize = parseInt(pageSizeChip.getAttribute('data-page-size-value'), 10) || 25;
        var chipInst = chipGroup._paginationInst;
        if (chipInst) {
          chipInst.pageSize = newPageSize;
          chipInst.currentPage = 1;
          applyPagination(chipInst);
        }
      }
      event.preventDefault();
      return;
    }

    // Pagination prev/next navigation — buttons tagged by initPagination with [data-pagination-nav].
    var paginationNavBtn = target.closest('[data-pagination-nav]');
    if (paginationNavBtn) {
      var navInst = paginationNavBtn._paginationInst;
      var navDir = paginationNavBtn.getAttribute('data-pagination-nav');
      if (navInst && navDir) {
        var navFilteredRows = getPaginationFilteredRows(navInst.table);
        var navTotalPages = navFilteredRows.length > 0 ? Math.ceil(navFilteredRows.length / navInst.pageSize) : 1;
        if (navDir === 'prev' && navInst.currentPage > 1) {
          navInst.currentPage -= 1;
          applyPagination(navInst);
        } else if (navDir === 'next' && navInst.currentPage < navTotalPages) {
          navInst.currentPage += 1;
          applyPagination(navInst);
        }
      }
      event.preventDefault();
      return;
    }

    const optionCard = target.closest('.crm-option-card');
    if (optionCard) {
      const group = optionCard.closest('.crm-option-grid');
      if (group) {
        group.querySelectorAll('.crm-option-card').forEach(function (card) {
          card.classList.remove('is-selected');
        });
      }
      optionCard.classList.add('is-selected');
      const radio = optionCard.querySelector('input[type="radio"]');
      if (radio) {
        radio.checked = true;
        radio.dispatchEvent(new Event('change', { bubbles: true }));
      }
      if (optionCard.tagName === 'A') {
        event.preventDefault();
      }
    }

    const binaryPill = target.closest('.crm-binary-control label');
    if (binaryPill) {
      const binaryGroup = binaryPill.closest('.crm-binary-control');
      if (binaryGroup) {
        binaryGroup.querySelectorAll('label').forEach(function (pill) {
          pill.classList.remove('is-active');
        });
      }
      binaryPill.classList.add('is-active');
      const radio = binaryPill.querySelector('input[type="radio"]');
      if (radio) {
        radio.checked = true;
      }
    }

    const radioTile = target.closest('.crm-radio-tile');
    if (radioTile) {
      const radio = radioTile.querySelector('input[type="radio"]');
      if (radio) {
        radio.checked = true;
        radio.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }

    const checkRow = target.closest('.crm-check-row');
    if (checkRow) {
      const input = checkRow.querySelector('input[type="checkbox"], input[type="radio"]');
      if (input && input.type === 'radio') {
        input.checked = true;
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }

    const filterOption = target.closest('.crm-filter-option[data-filter-option]');
    if (filterOption) {
      applyFilterOptionSelection(filterOption);
      event.preventDefault();
      return;
    }

    const filterTrigger = target.closest('.crm-filter-trigger');
    if (filterTrigger) {
      const filterMenu = filterTrigger.closest('.crm-filter-menu');
      if (filterMenu) {
        requestAnimationFrame(function () {
          if (filterMenu.open) closeOpenFilterMenus(filterMenu);
        });
      }
      return;
    }

    if (!target.closest('.crm-filter-menu')) closeOpenFilterMenus();

    // Row / card data-href navigation — clicking a [data-href] row navigates unless an interactive element is the target.
    const hrefHost = target.closest('[data-href]');
    if (hrefHost) {
      const directAnchor = target.closest('a[href]');
      if (directAnchor && !directAnchor.matches('[href="#"]')) {
        return;
      }

      const interactive = target.closest('button, input, select, textarea, label, [role="button"]');
      if (interactive) {
        return;
      }

      const href = hrefHost.dataset.href;
      if (href) {
        window.location.href = href;
      }
    }
  });

  // ── Form submit prevention ───────────────────────────────────────────────
  // [data-form] prevents default submission; prototype-only behavior.
  document.addEventListener('submit', function (event) {
    const form = event.target;
    if (form.matches('[data-form]')) {
      event.preventDefault();
    }

    if (isRequestsPage() && form.matches('[data-form="request-create"]')) {
      setRequestCreatePanelOpen(false, false);
    }
  });


  document.addEventListener('input', function (event) {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    if (target.matches('[data-auth-form] [data-auth-required]:not([type="checkbox"])')) {
      const targetValue = target.value ? target.value.trim() : '';
      if (target.classList.contains('is-invalid') && targetValue.length > 0) {
        setAuthControlValidState(target, true);
        const form = target.closest('[data-auth-form]');
        if (form && !form.querySelector('[data-auth-required].is-invalid')) {
          const authAlert = form.querySelector('[data-auth-alert]');
          if (authAlert) authAlert.hidden = true;
        }
      }
    }

    const panel = target.closest('.crm-filter-panel');
    if (panel) {
      syncResetButtonState(panel);
      applyStaticFilters(panel);
    }
  });

  document.addEventListener('change', function (event) {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    if (target instanceof HTMLInputElement && target.matches('[data-auth-form] [data-auth-required][type="checkbox"]') && target.classList.contains('is-invalid') && target.checked) {
      setAuthControlValidState(target, true);
      const form = target.closest('[data-auth-form]');
      if (form && !form.querySelector('[data-auth-required].is-invalid')) {
        const authAlert = form.querySelector('[data-auth-alert]');
        if (authAlert) authAlert.hidden = true;
      }
    }

    if (target instanceof HTMLInputElement && target.matches('.crm-radio-tile input[type="radio"]')) {
      const scope = findControlScope(target);
      syncRadioTileGroup(scope, target.name);
    }

    if (target instanceof HTMLInputElement && target.matches('.crm-check-row input[type="checkbox"], .crm-check-row input[type="radio"]')) {
      const row = target.closest('.crm-check-row');
      if (row) {
        row.classList.toggle('is-active', target.checked);
      }

      if (target.type === 'radio') {
        const scope = findControlScope(target);
        scope.querySelectorAll('.crm-check-row input[type="radio"][name="' + escapeCssValue(target.name) + '"]').forEach(function (radio) {
          const radioRow = radio.closest('.crm-check-row');
          if (radioRow) {
            radioRow.classList.toggle('is-active', radio.checked);
          }
        });
      }
    }

    const panel = target.closest('.crm-filter-panel');
    if (panel) {
      syncResetButtonState(panel);
      applyStaticFilters(panel);
    }
  });

  initFilterMenus();
  initFilterPanelDefaults(document);
  syncResetButtonState(document);
  applyStaticFilters(document);
  initPagination();

  // ── UIkit tabs / init ────────────────────────────────────────────────────
  if (window.UIkit) {
    document.querySelectorAll('ul[uk-tab], .crm-tabs[uk-tab]').forEach(function (tab) {
      window.UIkit.tab(tab);
    });
  }

  // ── Inline representative add-form ────────────────────────────────────────
  document.addEventListener('click', function (event) {
    var target = event.target;
    if (!(target instanceof Element)) return;

    var openBtn = target.closest('[data-action="open-representative-modal"]');
    if (openBtn) {
      var section = openBtn.closest('[data-entity="representatives"]');
      var slot = section ? section.querySelector('[data-role="representative-form-slot"]') : null;
      if (slot) {
        slot.hidden = false;
        var firstField = slot.querySelector('input:not([type="checkbox"]), select');
        if (firstField) firstField.focus();
      }
      event.preventDefault();
      return;
    }

    var closeBtn = target.closest('[data-action="close-representative-modal"]');
    if (closeBtn) {
      var slot = closeBtn.closest('[data-role="representative-form-slot"]');
      if (slot) slot.hidden = true;
      event.preventDefault();
      return;
    }

    var saveBtn = target.closest('[data-action="save-representative"]');
    if (saveBtn) {
      var slot = saveBtn.closest('[data-role="representative-form-slot"]');
      if (slot) slot.hidden = true;
      event.preventDefault();
      return;
    }
  });

  document.addEventListener('change', function (event) {
    var target = event.target;
    if (!(target instanceof HTMLInputElement)) return;
    var toggle = target.closest('[data-action="toggle-representative-expiry"]');
    if (toggle) {
      var slot = toggle.closest('[data-role="representative-form-slot"]');
      var expiry = slot ? slot.querySelector('[data-role="representative-expiry"]') : null;
      if (expiry) {
        expiry.disabled = toggle.checked;
        if (toggle.checked) expiry.value = '';
      }
    }
  });

  // ── Inline add-agent form (agents.html) ──────────────────────────────────
  document.addEventListener('click', function (event) {
    var target = event.target;
    if (!(target instanceof Element)) return;

    if (target.closest('[data-action="add-agent"]')) {
      var form = document.querySelector('[data-agent-form]');
      if (form) {
        form.hidden = false;
        var firstField = form.querySelector('input:not([type="hidden"]), select');
        if (firstField) firstField.focus();
      }
      event.preventDefault();
      return;
    }

    if (target.closest('[data-action="close-agent-form"]')) {
      var form = document.querySelector('[data-agent-form]');
      if (form) form.hidden = true;
      event.preventDefault();
      return;
    }
  });

  document.addEventListener('submit', function (event) {
    var form = event.target;
    if (form.matches('[data-form="agent-create"]')) {
      var agentForm = document.querySelector('[data-agent-form]');
      if (agentForm) agentForm.hidden = true;
    }
  });

  // ── Sortable table implementation ────────────────────────────────────────
  document.addEventListener('click', function (event) {
    var target = event.target;
    if (!(target instanceof Element)) return;

    var sortButton = target.closest('[data-sortable-table] .crm-th-sort-button');
    if (!sortButton) return;

    var th = sortButton.closest('th[data-sort-key]');
    if (!th) return;

    var table = sortButton.closest('[data-sortable-table]');
    if (!table) return;

    event.preventDefault();

    var sortKey = th.getAttribute('data-sort-key');
    var sortType = th.getAttribute('data-sort-type') || 'text';
    var currentSort = th.getAttribute('aria-sort');

    // Determine next sort direction
    var nextSort = 'ascending';
    if (currentSort === 'ascending') {
      nextSort = 'descending';
    }

    // Get all th elements with sort functionality
    table.querySelectorAll('th[data-sort-key]').forEach(function (otherTh) {
      otherTh.setAttribute('aria-sort', 'none');
      otherTh.classList.remove('is-sorted-asc', 'is-sorted-desc');
      var sortSpan = otherTh.querySelector('.crm-th-sort');
      if (sortSpan) {
        sortSpan.textContent = '▾';
      }
    });

    // Set the current header's sort state
    th.setAttribute('aria-sort', nextSort);
    th.classList.add(nextSort === 'ascending' ? 'is-sorted-asc' : 'is-sorted-desc');
    var sortSpan = th.querySelector('.crm-th-sort');
    if (sortSpan) {
      sortSpan.textContent = nextSort === 'ascending' ? '▴' : '▾';
    }

    // Get table body and rows
    var tbody = table.querySelector('tbody');
    if (!tbody) return;

    var rows = Array.from(tbody.querySelectorAll(':scope > tr:not([data-sort-ignore])')).filter(function (row) {
      return !row.classList.contains('is-filter-hidden');
    });
    if (rows.length === 0) return;

    // Find the column index
    var columnIndex = Array.from(th.parentElement.children).indexOf(th);

    // Sort rows
    rows.sort(function (rowA, rowB) {
      var cellA = rowA.children[columnIndex];
      var cellB = rowB.children[columnIndex];

      if (!cellA || !cellB) return 0;

      var valueA = getCellSortValue(cellA, sortType);
      var valueB = getCellSortValue(cellB, sortType);

      var comparison = compareValues(valueA, valueB, sortType);
      return nextSort === 'ascending' ? comparison : -comparison;
    });

    // Re-append sorted rows to tbody
    rows.forEach(function (row) {
      tbody.appendChild(row);
    });

    refreshPaginationForTable(table, true);
  });

  function normalizeSortText(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
  }

  function parseSortValue(value, sortType) {
    var normalized = normalizeSortText(value);

    if (sortType === 'number') {
      var number = Number(normalized.replace(/\s+/g, '').replace(/,/g, '.').replace(/[^0-9.-]/g, ''));
      return Number.isFinite(number) ? number : null;
    }

    if (sortType === 'money') {
      var money = Number(normalized.replace(/\s+/g, '').replace(/,/g, '.').replace(/[^0-9.-]/g, ''));
      return Number.isFinite(money) ? money : null;
    }

    if (sortType === 'percent') {
      var percent = Number(normalized.replace(/\s+/g, '').replace('%', '').replace(/,/g, '.').replace(/[^0-9.-]/g, ''));
      return Number.isFinite(percent) ? percent : null;
    }

    if (sortType === 'date') {
      var isoMatch = normalized.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (isoMatch) {
        var isoDate = new Date(Date.UTC(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3])));
        return Number.isNaN(isoDate.getTime()) ? null : isoDate.getTime();
      }
      var ruMatch = normalized.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
      if (ruMatch) {
        var ruDate = new Date(Date.UTC(Number(ruMatch[3]), Number(ruMatch[2]) - 1, Number(ruMatch[1])));
        return Number.isNaN(ruDate.getTime()) ? null : ruDate.getTime();
      }
      return null;
    }

    return normalized;
  }

  function getCellSortValue(cell, sortType) {
    if (!cell) return { parsed: null, text: '' };
    var sourceValue = cell.getAttribute('data-sort-value');
    var rawValue = sourceValue != null ? sourceValue : cell.textContent;
    var text = normalizeSortText(rawValue);
    return { parsed: parseSortValue(text, sortType), text: text };
  }

  function compareValues(a, b, sortType) {
    if (a.parsed !== null && b.parsed !== null) {
      if (a.parsed < b.parsed) return -1;
      if (a.parsed > b.parsed) return 1;
      return 0;
    }

    return a.text.localeCompare(b.text, 'ru', { numeric: true, sensitivity: 'base' });
  }
  // ── Global search preview and navigation ────────────────────────────────
  var GLOBAL_SEARCH_MAX_RESULTS = 8;
  var GLOBAL_SEARCH_DATA = [
    {
      code: 'CL-4401',
      title: 'АО «Восток Майнинг Системс»',
      category: 'Субъект',
      meta: 'Юридическое лицо · ИНН 7701234567 · Брокерский договор BR-8821',
      status: 'Активен',
      statusClass: 'info',
      href: 'subject-card.html',
      search: 'CL-4401 АО Восток Майнинг Системс субъект юридическое лицо ИНН 7701234567 BR-8821 P-24108 ao vostok mining'
    },
    {
      code: 'CL-4412',
      title: 'Громова Алина Сергеевна',
      category: 'Субъект',
      meta: 'Физическое лицо · Договор ДУ-8839 · Доверительное управление',
      status: 'Активен',
      statusClass: 'info',
      href: 'subject-card.html',
      search: 'CL-4412 Громова Алина Сергеевна физическое лицо ДУ-8839 субъект trust management'
    },
    {
      code: 'BR-8821',
      title: 'Брокерский договор',
      category: 'Договор',
      meta: 'АО «Восток Майнинг Системс» · CL-4401 · Открыт 12.01.2024',
      status: 'Активен',
      statusClass: 'info',
      href: 'contract-edit.html',
      search: 'BR-8821 брокерский договор АО Восток Майнинг Системс CL-4401 contract ao'
    },
    {
      code: 'P-24108',
      title: 'Вывод денежных средств',
      category: 'Поручение',
      meta: 'АО «Восток Майнинг Системс» · CL-4401 · 24.04.2026',
      status: 'Ожидает',
      statusClass: 'warning',
      href: 'requests.html',
      search: 'P-24108 поручение вывод ДС АО Восток Майнинг Системс CL-4401 request req'
    },
    {
      code: 'P-24103',
      title: 'Перевод ценных бумаг',
      category: 'Поручение',
      meta: 'Громова А.С. · CL-4412 · 23.04.2026',
      status: 'Принято',
      statusClass: 'info',
      href: 'requests.html',
      search: 'P-24103 поручение перевод ЦБ Громова CL-4412 request req'
    },
    {
      code: 'KYC-2024-0041',
      title: 'Проверка KYC',
      category: 'Комплаенс',
      meta: 'АО «Восток Майнинг Системс» · CL-4401 · Обновлено 20.04.2026',
      status: 'На проверке',
      statusClass: 'warning',
      href: 'compliance-card.html',
      search: 'KYC-2024-0041 комплаенс проверка KYC АО Восток Майнинг Системс CL-4401 compliance ao'
    },
    {
      code: 'AML-2024-0018',
      title: 'Плановая AML-проверка',
      category: 'Комплаенс',
      meta: 'Громова А.С. · CL-4412 · Завершено 05.03.2026',
      status: 'Пройдено',
      statusClass: 'info',
      href: 'compliance-card.html',
      search: 'AML-2024-0018 комплаенс AML Громова CL-4412 compliance'
    },
    {
      code: 'INV-1011',
      title: 'АО «Восток Майнинг Системс»',
      category: 'Трейдинг',
      meta: 'Торговый профиль · BR-2026/00444 · QUIK / WebQUIK',
      status: 'Квал',
      statusClass: 'success',
      href: 'trading-card.html',
      search: 'INV-1011 АО Восток Майнинг Системс торговый профиль BR-2026/00444 QUIK WebQUIK trading inv ao'
    },
    {
      code: 'INV-1012',
      title: 'АО «Глобал Ресурс Траст»',
      category: 'Трейдинг',
      meta: 'Торговый профиль · BR-2026/00412 · Распорядитель Иванов И.И.',
      status: 'Активен',
      statusClass: 'success',
      href: 'trading-card.html',
      search: 'INV-1012 АО Глобал Ресурс Траст Иванов И.И. торговый профиль WebQUIK trading inv ao'
    },
    {
      code: 'AR-00182',
      title: 'Расторжение договора BR-7012',
      category: 'Архив',
      meta: 'Клиент CL-4388 · Архивировано 14.02.2026',
      status: 'Архивировано',
      statusClass: 'success',
      href: 'archive.html',
      search: 'AR-00182 архив договор BR-7012 клиент CL-4388 archive'
    },
    {
      code: 'КЛ-003',
      title: 'Отчёт об операциях с ЦБ за март 2026',
      category: 'Отчёт',
      meta: 'АО «Север Капитал» · ДУ-2022-012 · Создал Иванов И.И.',
      status: 'Доставлен',
      statusClass: 'success',
      href: 'middle-office-reports.html',
      search: 'КЛ-003 отчет отчёт операции ЦБ АО Север Капитал ДУ-2022-012 Иванов middle office report'
    },
    {
      code: 'DEP-CL-910204',
      title: 'DEP_daily_CL-910204_2026-04-21_0745.xlsx',
      category: 'Депозитарий',
      meta: 'АО «Восток Майнинг Системс» · CL-910204 · Создал Иванов И.И.',
      status: 'Сформирован',
      statusClass: 'muted',
      href: 'depository.html',
      search: 'DEP_daily_CL-910204_2026-04-21_0745.xlsx депозитарий АО Восток Майнинг Системс Иванов report dep ao'
    }
  ];

  function normalizeGlobalSearchValue(value) {
    return String(value || '').replace(/\s+/g, ' ').trim().toLowerCase().replace(/ё/g, 'е');
  }

  function getPageHref(pageName, query) {
    var inPagesDir = /\/pages\/[^/]*$/i.test(window.location.pathname.replace(/\\/g, '/'));
    var prefix = inPagesDir ? '' : 'pages/';
    var href = prefix + pageName;
    if (query) href += '?q=' + encodeURIComponent(query);
    return href;
  }

  function getGlobalSearchItemHref(item) {
    if (!item || !item.href) return '#';
    if (/^(https?:|#|mailto:|tel:)/i.test(item.href)) return item.href;
    var inPagesDir = /\/pages\/[^/]*$/i.test(window.location.pathname.replace(/\\/g, '/'));
    return (inPagesDir ? '' : 'pages/') + item.href;
  }

  function getGlobalSearchMatches(query) {
    var normalizedQuery = normalizeGlobalSearchValue(query);
    if (!normalizedQuery) return [];

    var tokens = normalizedQuery.split(' ').filter(Boolean);
    return GLOBAL_SEARCH_DATA.filter(function (item) {
      var haystack = normalizeGlobalSearchValue([
        item.code,
        item.title,
        item.category,
        item.meta,
        item.status,
        item.search
      ].join(' '));

      return tokens.every(function (token) {
        return haystack.indexOf(token) !== -1;
      });
    }).slice(0, GLOBAL_SEARCH_MAX_RESULTS);
  }

  function appendGlobalSearchText(parent, className, text) {
    var node = document.createElement('span');
    node.className = className;
    node.textContent = text;
    parent.appendChild(node);
    return node;
  }

  function renderGlobalSearchPreview(resultsNode, matches, query) {
    resultsNode.innerHTML = '';

    if (!matches.length) {
      var empty = document.createElement('div');
      empty.className = 'crm-search-preview-empty';
      empty.textContent = 'Ничего не найдено';
      resultsNode.appendChild(empty);
      return;
    }

    matches.forEach(function (item) {
      var link = document.createElement('a');
      link.className = 'crm-search-preview-item';
      link.href = getGlobalSearchItemHref(item);

      var body = document.createElement('span');
      body.className = 'crm-search-preview-body';

      appendGlobalSearchText(body, 'crm-search-preview-code', item.code);
      appendGlobalSearchText(body, 'crm-search-preview-title', item.title);

      var meta = document.createElement('span');
      meta.className = 'crm-search-preview-meta';
      meta.textContent = item.category + ' · ' + item.meta;
      body.appendChild(meta);

      link.appendChild(body);

      if (item.status) {
        var status = document.createElement('span');
        status.className = 'crm-badge ' + (item.statusClass || 'muted') + ' crm-search-preview-status';
        status.textContent = item.status;
        link.appendChild(status);
      }

      resultsNode.appendChild(link);
    });
  }

  function initGlobalSearchPreview(input) {
    if (!(input instanceof HTMLInputElement) || input.dataset.globalSearchReady === 'true') return;

    var shell = input.closest('.crm-search');
    if (!shell) return;

    input.dataset.globalSearchReady = 'true';
    input.setAttribute('data-role', 'global-search-input');
    input.setAttribute('aria-autocomplete', 'list');
    input.setAttribute('aria-expanded', 'false');
    shell.setAttribute('data-entity', 'global-search');

    var previewId = 'global-search-preview-' + Math.random().toString(36).slice(2, 9);
    var preview = document.createElement('div');
    preview.className = 'crm-search-preview';
    preview.hidden = true;
    preview.id = previewId;
    preview.setAttribute('data-role', 'global-search-preview');

    var results = document.createElement('div');
    results.className = 'crm-search-preview-results';
    results.setAttribute('data-role', 'global-search-results');
    preview.appendChild(results);

    var footer = document.createElement('a');
    footer.className = 'crm-search-preview-view-all';
    footer.setAttribute('data-role', 'global-search-view-all');
    footer.textContent = 'Показать все результаты';
    preview.appendChild(footer);

    input.setAttribute('aria-controls', previewId);
    shell.appendChild(preview);

    function updateFooterHref() {
      footer.href = getPageHref('search-results.html', input.value.trim());
    }

    function openPreview() {
      var query = input.value.trim();
      if (!query) {
        closePreview();
        return;
      }

      renderGlobalSearchPreview(results, getGlobalSearchMatches(query), query);
      updateFooterHref();
      preview.hidden = false;
      shell.classList.add('is-search-preview-open');
      input.setAttribute('aria-expanded', 'true');
    }

    function closePreview() {
      preview.hidden = true;
      results.innerHTML = '';
      shell.classList.remove('is-search-preview-open');
      input.setAttribute('aria-expanded', 'false');
    }

    input.addEventListener('focus', openPreview);
    input.addEventListener('input', openPreview);

    input.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') {
        closePreview();
        input.blur();
        return;
      }

      if (event.key !== 'Enter') return;
      event.preventDefault();
      var query = input.value.trim();
      if (!query) return;
      window.location.href = getPageHref('search-results.html', query);
    });

    shell.addEventListener('focusout', function () {
      window.setTimeout(function () {
        if (!shell.contains(document.activeElement)) closePreview();
      }, 160);
    });

    document.addEventListener('click', function (event) {
      var target = event.target;
      if (!(target instanceof Element)) return;
      if (!shell.contains(target)) closePreview();
    });

    updateFooterHref();
  }

  document.querySelectorAll('input[name="global-search"]').forEach(initGlobalSearchPreview);

  document.addEventListener('click', function (event) {
    var target = event.target;
    if (!(target instanceof Element)) return;

    var toggleButton = target.closest('[data-password-toggle]');
    if (!toggleButton) return;

    var targetId = toggleButton.getAttribute('data-password-target');
    var passwordInput = targetId ? document.getElementById(targetId) : null;

    if (!passwordInput) {
      var wrapper = toggleButton.closest('.crm-auth-password-wrap');
      passwordInput = wrapper ? wrapper.querySelector('input[type="password"], input[type="text"]') : null;
    }

    if (!passwordInput) return;

    var makeVisible = passwordInput.type === 'password';
    passwordInput.type = makeVisible ? 'text' : 'password';
    toggleButton.textContent = makeVisible ? 'Скрыть' : 'Показать';
    toggleButton.setAttribute('aria-pressed', makeVisible ? 'true' : 'false');
  });

  // ── Agent subject static lookup (agents.html only) ───────────────────────
  // Scoped to body[data-page="agents"] / [data-form="agent-create"].
  // UMI.CMS will replace this with a real server-side subject autocomplete.
  (function () {
    if (!(document.body && document.body.dataset.page === 'agents')) return;

    var form = document.querySelector('[data-form="agent-create"]');
    if (!form) return;

    var input = form.querySelector('[data-entity="agent-subject-search"]');
    if (!input) return;

    var wrap = input.closest('.crm-agents-subject-wrap');
    if (!wrap) return;

    var resultBlock = form.querySelector('[data-entity="agent-subject-result"]');

    var hiddenId = form.querySelector('[data-entity="agent-subject-id"]');
    if (!hiddenId) {
      hiddenId = document.createElement('input');
      hiddenId.type = 'hidden';
      hiddenId.name = 'agent-subject-id';
      hiddenId.setAttribute('data-entity', 'agent-subject-id');
      form.appendChild(hiddenId);
    }

    var lookup = document.createElement('div');
    lookup.className = 'crm-agents-subject-lookup';
    lookup.setAttribute('data-entity', 'agent-subject-lookup');
    lookup.setAttribute('role', 'listbox');
    lookup.setAttribute('aria-label', 'Результаты поиска субъекта');
    lookup.hidden = true;
    wrap.appendChild(lookup);

    var SUBJECTS = [
      { id: 'S-001', name: 'АО «Восток Майнинг Системс»',      inn: '7704132901',   type: 'Юр. лицо', alias: 'ao' },
      { id: 'S-002', name: 'АО «Глобал Ресурс Траст»',          inn: '7705964812',   type: 'Юр. лицо', alias: 'ao' },
      { id: 'S-003', name: 'Громова Алина Сергеевна',            inn: '502113742889', type: 'Физ. лицо', alias: '' },
      { id: 'S-004', name: 'ООО «Север Логистик Капитал»',       inn: '7812054881',   type: 'Юр. лицо', alias: 'ooo' },
      { id: 'S-005', name: 'ИП Мартынов Кирилл Андреевич',      inn: '772608314579', type: 'ИП',        alias: 'ip' },
      { id: 'S-006', name: 'Романова Дарья Алексеевна',          inn: '503228776514', type: 'Физ. лицо', alias: '' }
    ];

    var isSelected = false;

    function normalizeSubjectQuery(value) {
      return String(value || '').replace(/\s+/g, ' ').trim().toLowerCase().replace(/ё/g, 'е');
    }

    function getSubjectMatches(query) {
      var q = normalizeSubjectQuery(query);
      if (!q) return [];
      var tokens = q.split(' ').filter(Boolean);
      return SUBJECTS.filter(function (s) {
        var haystack = normalizeSubjectQuery(s.name + ' ' + s.inn + ' ' + s.type + ' ' + (s.alias || ''));
        return tokens.every(function (token) { return haystack.indexOf(token) !== -1; });
      });
    }

    function closeLookup() {
      lookup.hidden = true;
      lookup.innerHTML = '';
    }

    function clearSelection() {
      isSelected = false;
      hiddenId.value = '';
      if (resultBlock) resultBlock.hidden = true;
    }

    function selectSubject(subject) {
      isSelected = true;
      input.value = subject.name;
      hiddenId.value = subject.id;
      closeLookup();
      if (resultBlock) {
        var span = resultBlock.querySelector('span');
        if (span) span.textContent = 'Выбран: ' + subject.name + ' · ИНН ' + subject.inn;
        resultBlock.hidden = false;
      }
    }

    function openLookup(query) {
      var matches = getSubjectMatches(query);
      lookup.innerHTML = '';

      if (!matches.length) {
        var empty = document.createElement('div');
        empty.className = 'crm-agents-subject-lookup-empty';
        empty.textContent = 'Ничего не найдено';
        lookup.appendChild(empty);
        lookup.hidden = false;
        return;
      }

      matches.forEach(function (subject) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'crm-agents-subject-option';
        btn.setAttribute('role', 'option');
        btn.setAttribute('data-action', 'select-agent-subject');
        btn.setAttribute('data-subject-id', subject.id);
        btn.setAttribute('data-subject-name', subject.name);
        btn.setAttribute('data-subject-inn', subject.inn);
        btn.setAttribute('data-subject-type', subject.type);

        var nameEl = document.createElement('span');
        nameEl.className = 'crm-agents-subject-option-name';
        nameEl.textContent = subject.name;

        var metaEl = document.createElement('span');
        metaEl.className = 'crm-agents-subject-option-meta';
        metaEl.textContent = 'ИНН ' + subject.inn + ' · ' + subject.type;

        btn.appendChild(nameEl);
        btn.appendChild(metaEl);

        btn.addEventListener('mousedown', function (event) {
          event.preventDefault();
        });
        btn.addEventListener('click', function () {
          selectSubject(subject);
        });

        lookup.appendChild(btn);
      });

      lookup.hidden = false;
    }

    input.addEventListener('input', function () {
      var query = input.value.trim();
      if (isSelected) clearSelection();
      if (!query) { closeLookup(); return; }
      openLookup(query);
    });

    input.addEventListener('focus', function () {
      var query = input.value.trim();
      if (query && !isSelected) openLookup(query);
    });

    input.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') {
        closeLookup();
        input.blur();
      }
    });

    wrap.addEventListener('focusout', function () {
      window.setTimeout(function () {
        if (!wrap.contains(document.activeElement)) closeLookup();
      }, 160);
    });

    document.addEventListener('click', function (event) {
      var target = event.target;
      if (!(target instanceof Element)) return;
      if (!wrap.contains(target)) closeLookup();
    });
  }());

  // ── Back-office counterparty add (back-office.html only) ─────────────────
  // Scoped to body[data-page="back-office"].
  // Enables the add button when a valid INN is not already in the table.
  // On click, shows inline confirmation in the hint; no separate panel opens.
  (function () {
    if (!(document.body && document.body.dataset.page === 'back-office')) return;

    var searchInput = document.getElementById('bo-search');
    var addBtn = document.querySelector('[data-action="open-counterparty-inline-add"]');
    var hintEl = document.querySelector('[data-entity="counterparty-add-hint"]');

    if (!searchInput || !addBtn) return;

    function getCrmInns() {
      var inns = {};
      document.querySelectorAll('[data-entity="counterparty"]').forEach(function (row) {
        var inn = row.getAttribute('data-counterparty-inn');
        if (inn) {
          inns[inn] = true;
        } else {
          var match = row.textContent.match(/\b(\d{10}|\d{12})\b/);
          if (match) inns[match[1]] = true;
        }
      });
      return inns;
    }

    function updateButtonAndHint() {
      var raw = searchInput.value.trim();
      var digits = raw.replace(/\D/g, '');
      var allDigits = raw === digits;
      var validLength = digits.length === 10 || digits.length === 12;
      var looksLikeInn = allDigits && validLength;
      var crmInns = looksLikeInn ? getCrmInns() : {};
      var isDuplicate = looksLikeInn && !!crmInns[digits];
      var isAvailable = looksLikeInn && !isDuplicate;

      addBtn.disabled = !isAvailable;

      if (!hintEl) return;

      if (!raw) {
        hintEl.textContent = 'Введите ИНН. Если контрагент не найден в реестре, его можно добавить.';
        hintEl.dataset.hintState = '';
      } else if (!allDigits) {
        hintEl.textContent = '';
        hintEl.dataset.hintState = '';
      } else if (!validLength) {
        hintEl.textContent = 'Введите корректный ИНН: 10 или 12 цифр.';
        hintEl.dataset.hintState = 'invalid';
      } else if (isDuplicate) {
        hintEl.textContent = 'Контрагент с таким ИНН уже есть в реестре.';
        hintEl.dataset.hintState = 'duplicate';
      } else {
        hintEl.textContent = 'Контрагент не найден в реестре. Можно добавить.';
        hintEl.dataset.hintState = 'available';
      }
    }

    searchInput.addEventListener('input', function () {
      updateButtonAndHint();
    });

    addBtn.addEventListener('click', function (event) {
      event.preventDefault();
      if (hintEl) {
        hintEl.textContent = 'Контрагент подготовлен к добавлению.';
        hintEl.dataset.hintState = 'confirmed';
      }
      addBtn.disabled = true;
    });

    updateButtonAndHint();
  }());

  // ── Statement export – print-ready HTML / backend PDF handoff ────────────────
  // Scoped to body[data-page="contract-wizard"] and body[data-page="contract-edit"].
  // Fetches the existing paper HTML template, fills it with form data, and either
  // sends the filled payload to a backend PDF endpoint or opens the filled HTML.
  // Static demo personal data are placeholders for UMI.CMS/server-side data binding.
  (function () {
    var page = document.body && document.body.dataset.page;
    if (page !== 'contract-wizard' && page !== 'contract-edit') return;

    var exportBtns = document.querySelectorAll('[data-action="export-statement"]');
    if (!exportBtns.length) return;

    var form = document.querySelector('[data-form="contract-wizard"], [data-form="contract-edit"]');

    function isChecked(name) {
      var scope = form || document;
      var el = scope.querySelector('input[name="' + name + '"]');
      return !!(el && el.checked);
    }

    function getSelectValue(name) {
      var scope = form || document;
      var el = scope.querySelector('select[name="' + name + '"]');
      return el ? el.value : '';
    }

    function getStatementDate() {
      var now = new Date();
      return String(now.getDate()).padStart(2, '0') + '.' +
             String(now.getMonth() + 1).padStart(2, '0') + '.' +
             now.getFullYear();
    }

    function getSummaryValue(label) {
      var summary = document.querySelector('.crm-contract-client-summary');
      if (!summary) return '';

      var items = summary.querySelectorAll('div');
      for (var i = 0; i < items.length; i += 1) {
        var title = items[i].querySelector('span');
        var value = items[i].querySelector('strong');
        if (title && value && title.textContent.trim() === label) {
          return value.textContent.trim();
        }
      }
      return '';
    }

    function collectFormValues() {
      var values = {};
      if (!form) return values;

      form.querySelectorAll('input[name], select[name], textarea[name]').forEach(function (el) {
        var name = el.name;
        if (!name) return;

        if (el.type === 'checkbox') {
          values[name] = el.checked;
          return;
        }

        if (el.type === 'radio') {
          if (el.checked) values[name] = el.value;
          return;
        }

        values[name] = el.value;
      });

      return values;
    }

    function collectData() {
      var reportEmail = '';
      var reportEmailEnabled = false;

      if (page === 'contract-wizard') {
        var wizMailEl = document.getElementById('wizard-mail');
        reportEmail = wizMailEl ? wizMailEl.value.trim() : '';
        reportEmailEnabled = !!reportEmail;
      } else {
        var editMailEl = document.getElementById('edit-report-email');
        reportEmail = editMailEl ? editMailEl.value.trim() : '';
        reportEmailEnabled = isChecked('report-email-enabled') && !!reportEmail;
      }

      var incomeVal = page === 'contract-wizard' ? getSelectValue('income-transfer').toLowerCase() : '';
      var clientEmail = reportEmail || getSummaryValue('Email');

      // Static demo personal data are placeholders for UMI.CMS/server-side data binding.
      return {
        sourcePage: page,
        clientName: getSummaryValue('Клиент'),
        clientCode: getSummaryValue('Код клиента'),
        inn: getSummaryValue('ИНН'),
        email: clientEmail,
        formValues: collectFormValues(),
        fields: {
          'client-full-name':          'Ковалёв Даниил Олегович',
          'passport-series':           '4512',
          'passport-number':           '345678',
          'passport-issued-by':        'ГУ МВД России по г. Москве',
          'passport-issue-day':        '22',
          'passport-issue-month-year': 'апреля 2026',
          'registration-address':      'г. Москва, ул. Примерная, д. 10, кв. 25',
          'report-email':              clientEmail,
          'statement-date':            getStatementDate(),
          'signature-name':            'Ковалёв Даниил Олегович'
        },
        checks: {
          'joined-broker':                  isChecked('joined-broker'),
          'joined-depository':              isChecked('joined-depository'),
          'depo-owner':                     isChecked('depo-owner'),
          'depo-nominee':                   isChecked('depo-nominee'),
          'depo-trust-manager':             isChecked('depo-trust-manager'),
          'trading-depo-owner':             isChecked('trading-depo-owner'),
          'trading-depo-nominee':           isChecked('trading-depo-nominee'),
          'trading-depo-trust-manager':     isChecked('trading-depo-trust-manager'),
          'depo-operator':                  isChecked('depo-operator'),
          'market-stock':                   isChecked('market-stock'),
          'market-futures':                 isChecked('market-futures'),
          'market-currency':                isChecked('market-currency'),
          'edo-signature':                  isChecked('edo-signature'),
          'edo-enable':                     isChecked('edo-enable'),
          'report-office':                  isChecked('report-office'),
          'report-post':                    isChecked('report-post'),
          'report-email':                   reportEmailEnabled,
          'report-edo':                     isChecked('report-edo'),
          'income-transfer-broker-account': page === 'contract-wizard'
            ? incomeVal.indexOf('брокерский') !== -1
            : isChecked('income-special'),
          'income-transfer-bank-account':   page === 'contract-wizard'
            ? (incomeVal.indexOf('расчётный') !== -1 || incomeVal.indexOf('расчетный') !== -1)
            : isChecked('income-bank')
        }
      };
    }

    function fillTemplateDoc(doc, data) {
      doc.querySelectorAll('[data-doc-field]').forEach(function (el) {
        var key = el.getAttribute('data-doc-field');
        if (Object.prototype.hasOwnProperty.call(data.fields, key)) {
          el.textContent = data.fields[key];
        }
      });
      doc.querySelectorAll('[data-doc-check]').forEach(function (el) {
        var key = el.getAttribute('data-doc-check');
        if (data.checks[key]) {
          el.classList.add('is-checked');
        } else {
          el.classList.remove('is-checked');
        }
      });
    }

    function buildFilledHtml(doc) {
      return '<!doctype html>\n' + doc.documentElement.outerHTML;
    }

    function buildPayload(exportBtn, data, filledHtml) {
      return {
        sourcePage: data.sourcePage,
        templateId: exportBtn.getAttribute('data-document-template') || '',
        clientName: data.clientName,
        clientCode: data.clientCode,
        inn: data.inn,
        email: data.email,
        formValues: data.formValues,
        fields: data.fields,
        checks: data.checks,
        html: filledHtml
      };
    }

    function downloadBlob(blob, filename) {
      var url = URL.createObjectURL(blob);
      var link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }

    function postToPdfEndpoint(endpoint, payload, filename) {
      return fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).then(function (response) {
        if (!response.ok) throw new Error('HTTP ' + response.status);
        return response.blob();
      }).then(function (blob) {
        downloadBlob(blob, filename);
      });
    }

    function openFilledHtml(filledHtml) {
      var preview = window.open('', '_blank');
      if (!preview) {
        alert('Не удалось открыть новую вкладку. Разрешите всплывающие окна для предпросмотра заявления.');
        return;
      }

      preview.document.open();
      preview.document.write(filledHtml);
      preview.document.close();

      console.info('Static fallback opened filled HTML. Use browser Save as PDF. UMI.CMS should provide a backend PDF endpoint for direct download.');
      alert('Заявление открыто в новой вкладке. Для прямого скачивания PDF нужен серверный endpoint UMI.CMS.');
    }

    exportBtns.forEach(function (exportBtn) {
      exportBtn.addEventListener('click', function (event) {
        event.preventDefault();

        var rawTemplateUrl = (exportBtn.getAttribute('data-template-url') || '').trim();
        if (!rawTemplateUrl) {
          console.warn('Statement export: data-template-url is missing or empty.', exportBtn);
          alert('Не задан путь к шаблону заявления (data-template-url).');
          return;
        }

        var templateUrl;
        try {
          templateUrl = new URL(rawTemplateUrl, window.location.href).href;
        } catch (urlErr) {
          console.warn('Statement export: could not resolve template URL:', rawTemplateUrl, urlErr);
          alert('Не удалось разрешить путь к шаблону заявления.');
          return;
        }

        var endpoint = (exportBtn.getAttribute('data-pdf-endpoint') || '').trim();
        var filename = exportBtn.getAttribute('data-pdf-filename') || 'zayavlenie-o-prisoedinenii-fl.pdf';
        var originalText = exportBtn.textContent;
        exportBtn.disabled = true;
        exportBtn.textContent = 'Готовим заявление...';

        var data = collectData();

        fetch(templateUrl)
          .then(function (response) {
            if (!response.ok) throw new Error('HTTP ' + response.status);
            return response.text();
          })
          .then(function (html) {
            var parser = new DOMParser();
            var doc = parser.parseFromString(html, 'text/html');
            fillTemplateDoc(doc, data);

            doc.querySelectorAll('link[rel="stylesheet"][href]').forEach(function (link) {
              link.setAttribute('href', new URL(link.getAttribute('href'), templateUrl).href);
            });

            var filledHtml = buildFilledHtml(doc);
            var payload = buildPayload(exportBtn, data, filledHtml);

            if (endpoint) {
              return postToPdfEndpoint(endpoint, payload, filename);
            }

            openFilledHtml(filledHtml);
            return null;
          })
          .catch(function (err) {
            console.error('Statement export failed:', err);
            alert('Не удалось подготовить заявление. Проверьте путь к шаблону заявления.');
          })
          .finally(function () {
            exportBtn.disabled = false;
            exportBtn.textContent = originalText;
          });
      });
    });
  }());

  // ── CSV table export ─────────────────────────────────────────────────────────
  // [data-action="export-table-csv"] downloads visible table rows as semicolon-delimited CSV.
  // Static demo behavior only. UMI.CMS should implement server-side CSV export for real datasets.
  // HTML hooks: data-action="export-table-csv", data-export-filename, data-export-scope, data-export-ignore.
  document.addEventListener('click', function (event) {
    var target = event.target;
    if (!(target instanceof Element)) return;

    var exportBtn = target.closest('[data-action="export-table-csv"]');
    if (!exportBtn) return;

    event.preventDefault();

    var shell = exportBtn.closest('.crm-registry-shell, .crm-registry-page, .crm-page') || document.body;
    var candidates = Array.from(shell.querySelectorAll('.crm-registry-table table, table[data-sortable-table], table'));

    var table = null;
    var i;
    for (i = 0; i < candidates.length; i++) {
      var c = candidates[i];
      var isAfterBtn = !!(exportBtn.compareDocumentPosition(c) & Node.DOCUMENT_POSITION_FOLLOWING);
      if (isAfterBtn && c.querySelector('tbody tr')) {
        table = c;
        break;
      }
    }
    if (!table) {
      for (i = 0; i < candidates.length; i++) {
        if (candidates[i].querySelector('tbody tr')) { table = candidates[i]; break; }
      }
    }
    if (!table) {
      console.warn('CSV export: no eligible table found in scope.', exportBtn);
      return;
    }

    var headerRow = table.tHead && table.tHead.rows[0];
    var headers = [];
    var ignoreIndices = [];
    if (headerRow) {
      Array.from(headerRow.cells).forEach(function (th, idx) {
        if (th.hasAttribute('data-export-ignore') || th.classList.contains('crm-export-ignore')) {
          ignoreIndices.push(idx);
          return;
        }
        var labelEl = th.querySelector('.crm-th-label');
        var raw = labelEl ? labelEl.textContent : th.textContent;
        var text = raw.replace(/[▾▲▼▴]/g, '').replace(/\s+/g, ' ').trim();
        if (!text || text === 'Действия') {
          ignoreIndices.push(idx);
          return;
        }
        headers.push({ index: idx, text: text });
      });
    }

    var tbody = table.tBodies && table.tBodies[0];
    var allRows = tbody ? Array.from(tbody.querySelectorAll(':scope > tr')) : [];
    var visibleRows = allRows.filter(function (row) {
      if (row.hidden) return false;
      if (row.classList.contains('is-filter-hidden')) return false;
      if (row.classList.contains('is-page-hidden')) return false;
      if (row.hasAttribute('data-sort-ignore')) return false;
      if (row.classList.contains('crm-empty-state')) return false;
      if (window.getComputedStyle(row).display === 'none') return false;
      return true;
    });

    function csvEscape(value) {
      var s = String(value || '').replace(/\s+/g, ' ').trim();
      if (s.indexOf(';') !== -1 || s.indexOf('"') !== -1 || s.indexOf('\n') !== -1 || s.indexOf('\r') !== -1) {
        s = '"' + s.replace(/"/g, '""') + '"';
      }
      return s;
    }

    var lines = [];
    if (headers.length > 0) {
      lines.push(headers.map(function (h) { return csvEscape(h.text); }).join(';'));
    }

    if (visibleRows.length === 0 && headers.length > 0) {
      console.info('CSV export contains headers only because no rows are visible.');
    }

    visibleRows.forEach(function (row) {
      var values = headers.map(function (h) {
        var cell = row.cells[h.index];
        return cell ? cell.textContent.replace(/\s+/g, ' ').trim() : '';
      });
      lines.push(values.map(csvEscape).join(';'));
    });

    var filename = (exportBtn.getAttribute('data-export-filename') || '').trim();
    if (!filename) {
      var pageAttr = (document.body.getAttribute('data-page') || '').trim();
      filename = pageAttr ? pageAttr + '.csv' : 'export.csv';
    }
    if (!/\.csv$/i.test(filename)) filename += '.csv';

    exportBtn.disabled = true;
    exportBtn.setAttribute('aria-busy', 'true');

    var bom = '﻿';
    var blob = new Blob([bom + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
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
  });

})();
