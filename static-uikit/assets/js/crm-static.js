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




  function setRepresentativeModalState(isOpen) {
    const modal = document.querySelector('[data-role="representative-modal"]');
    if (!modal) return;
    modal.hidden = !isOpen;
    document.body.classList.toggle('crm-modal-open', isOpen);
  }

  function syncRepresentativeExpiry() {
    const toggle = document.querySelector('[data-action="toggle-representative-expiry"]');
    const expiryInput = document.querySelector('[data-role="representative-expiry"]');
    if (!toggle || !expiryInput) return;
    expiryInput.disabled = !!toggle.checked;
  }

  function createProfileRow(label, value) {
    const row = document.createElement('div');
    row.className = 'crm-profile-row crm-data-field';
    row.innerHTML = '<div class="crm-profile-label"></div><div class="crm-profile-value"></div>';
    row.querySelector('.crm-profile-label').textContent = label;
    row.querySelector('.crm-profile-value').textContent = value;
    return row;
  }

  function createAddressCard(address) {
    const card = document.createElement('article');
    card.className = 'crm-address-row crm-address-card';
    card.innerHTML = '' +
      '<h4 class="crm-address-title"></h4>' +
      '<div class="crm-address-fields">' +
      '<div class="crm-address-field"><span class="crm-profile-label">Страна</span><strong></strong></div>' +
      '<div class="crm-address-field"><span class="crm-profile-label">Регион</span><strong></strong></div>' +
      '<div class="crm-address-field"><span class="crm-profile-label">Город</span><strong></strong></div>' +
      '<div class="crm-address-field crm-address-field-street"><span class="crm-profile-label">Улица</span><strong></strong></div>' +
      '<div class="crm-address-field"><span class="crm-profile-label">Дом</span><strong></strong></div>' +
      '<div class="crm-address-field"><span class="crm-profile-label">Индекс</span><strong></strong></div>' +
      '</div>';
    const strongs = card.querySelectorAll('strong');
    card.querySelector('.crm-address-title').textContent = address.title;
    strongs[0].textContent = address.country;
    strongs[1].textContent = address.region;
    strongs[2].textContent = address.city;
    strongs[3].textContent = address.street;
    strongs[4].textContent = address.house;
    strongs[5].textContent = address.index;
    return card;
  }

  function renderSubjectCardProfile() {
    const page = document.querySelector('.crm-page[data-page="subject-card"]');
    const data = window.subjectCardData;
    if (!page || !data) return;

    const mainGrid = page.querySelector('[data-role="main-data-grid"]');
    if (mainGrid && data.subjectProfile) {
      const fields = [
        ['Наименование клиента', data.subjectProfile.shortName],
        ['Полное наименование', data.subjectProfile.fullName],
        ['Английское наименование', data.subjectProfile.englishName],
        ['Тип клиента', data.subjectProfile.clientType],
        ['Признак резидентства', data.subjectProfile.residency],
        ['ИНН', data.subjectProfile.inn],
        ['КПП', data.subjectProfile.kpp],
        ['ОГРН', data.subjectProfile.ogrn],
        ['Квалификация инвестора', data.subjectProfile.investorStatus]
      ];
      mainGrid.innerHTML = '';
      fields.forEach(function (field) {
        mainGrid.appendChild(createProfileRow(field[0], field[1]));
      });
    }

    if (data.addresses) {
      const registrationHost = page.querySelector('[data-role="address-registration"]');
      const extraHost = page.querySelector('[data-role="addresses-extra"]');
      if (registrationHost) {
        registrationHost.innerHTML = '';
        registrationHost.appendChild(createAddressCard(data.addresses.registration));
      }
      if (extraHost) {
        extraHost.innerHTML = '';
        extraHost.appendChild(createAddressCard(data.addresses.location));
        extraHost.appendChild(createAddressCard(data.addresses.postal));
      }
    }

    const representativesBody = page.querySelector('[data-role="representatives-table-body"]');
    if (representativesBody && Array.isArray(data.representatives)) {
      representativesBody.innerHTML = '';
      data.representatives.forEach(function (item) {
        const tr = document.createElement('tr');
        tr.innerHTML = '' +
          '<td><strong></strong></td>' +
          '<td></td>' +
          '<td></td>' +
          '<td></td>' +
          '<td><span class="crm-badge"></span></td>';
        tr.children[0].querySelector('strong').textContent = item.fullName;
        tr.children[1].textContent = item.role;
        tr.children[2].textContent = item.authority;
        tr.children[3].textContent = item.validTo;
        const badge = tr.children[4].querySelector('.crm-badge');
        badge.textContent = item.statusLabel;
        badge.classList.add(item.statusClass);
        badge.dataset.status = item.statusCode;
        representativesBody.appendChild(tr);
      });
    }
  }
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') {
      closeSidebar();
      setRepresentativeModalState(false);
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

  document.addEventListener('click', function (event) {
    const target = event.target;

    const resetButton = target.closest('[data-action="reset-filters"]');
    if (resetButton) {
      const form = resetButton.closest('form');
      if (form) {
        form.reset();
        syncOptionGridState(form);
        syncBinaryPills(form);
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

    const toggleAddressesButton = target.closest('[data-action="toggle-addresses"]');
    if (toggleAddressesButton) {
      const section = toggleAddressesButton.closest('[data-role="addresses-section"], [data-entity="addresses"]');
      if (section) {
        const extra = section.querySelector('[data-role="addresses-extra"]');
        if (extra) {
          const isExpanded = toggleAddressesButton.getAttribute('aria-expanded') === 'true';
          extra.hidden = isExpanded;
          toggleAddressesButton.setAttribute('aria-expanded', String(!isExpanded));
          toggleAddressesButton.textContent = isExpanded ? 'Показать остальные адреса' : 'Скрыть остальные адреса';
        }
      }
      event.preventDefault();
      return;
    }

    if (target.closest('[data-action="open-representative-modal"]')) {
      setRepresentativeModalState(true);
      event.preventDefault();
      return;
    }

    if (target.closest('[data-action="close-representative-modal"]')) {
      setRepresentativeModalState(false);
      event.preventDefault();
      return;
    }

    if (target.closest('[data-action="save-representative"]')) {
      setRepresentativeModalState(false);
      event.preventDefault();
      return;
    }
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
  });

  document.addEventListener('change', function (event) {
    if (event.target.matches('[data-action="toggle-representative-expiry"]')) {
      syncRepresentativeExpiry();
    }
  });

  syncRepresentativeExpiry();
  renderSubjectCardProfile();

  if (window.UIkit) {
    document.querySelectorAll('ul[uk-tab], .crm-tabs[uk-tab]').forEach(function (tab) {
      window.UIkit.tab(tab);
    });
  }
})();
