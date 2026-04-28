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

  if (window.UIkit) {
    document.querySelectorAll('ul[uk-tab], .crm-tabs[uk-tab]').forEach(function (tab) {
      window.UIkit.tab(tab);
    });
  }
})();
