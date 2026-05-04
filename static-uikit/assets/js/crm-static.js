(function () {
  const app = document.querySelector('.crm-app');
  const toggle = document.querySelector('[data-sidebar-toggle]');
  const sidebar = document.querySelector('.crm-sidebar');

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
      }
      event.preventDefault();
      return;
    }



    const pageSizeChip = target.closest('[data-page-size-group] .crm-footer-chip');
    if (pageSizeChip) {
      const chipGroup = pageSizeChip.closest('[data-page-size-group]');
      if (chipGroup) {
        chipGroup.querySelectorAll('.crm-footer-chip').forEach(function (chip) {
          const isActive = chip === pageSizeChip;
          chip.classList.toggle('is-active', isActive);
          chip.setAttribute('aria-pressed', isActive ? 'true' : 'false');
        });
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
    }
  });

  document.addEventListener('change', function (event) {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;

    if (target.matches('[data-auth-form] [data-auth-required][type="checkbox"]') && target.classList.contains('is-invalid') && target.checked) {
      setAuthControlValidState(target, true);
      const form = target.closest('[data-auth-form]');
      if (form && !form.querySelector('[data-auth-required].is-invalid')) {
        const authAlert = form.querySelector('[data-auth-alert]');
        if (authAlert) authAlert.hidden = true;
      }
    }

    if (target.matches('.crm-radio-tile input[type="radio"]')) {
      const scope = findControlScope(target);
      syncRadioTileGroup(scope, target.name);
    }

    if (target.matches('.crm-check-row input[type="checkbox"], .crm-check-row input[type="radio"]')) {
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
    }
  });

  initFilterMenus();
  initFilterPanelDefaults(document);
  syncResetButtonState(document);

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

    var rows = Array.from(tbody.querySelectorAll('> tr:not([hidden]):not(.is-hidden):not([data-sort-ignore])'.replace('> ', ':scope > ')));
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
  // ── Global search navigation ─────────────────────────────────────────────
  var globalSearchInput = document.querySelector('input[name="global-search"]');
  if (globalSearchInput) {
    globalSearchInput.addEventListener('keydown', function (event) {
      if (event.key !== 'Enter') return;
      event.preventDefault();
      var query = globalSearchInput.value.trim();
      if (!query) return;
      window.location.href = 'search-results.html?q=' + encodeURIComponent(query);
    });
  }

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

})();
