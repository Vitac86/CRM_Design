(function () {
  const app = document.querySelector('.crm-app');
  const toggle = document.querySelector('[data-sidebar-toggle]');
  if (toggle && app) {
    toggle.addEventListener('click', function () {
      app.classList.toggle('sidebar-open');
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
      group.classList.toggle('active', expanded && !hasActiveChild);
      if (groupToggle) groupToggle.setAttribute('aria-expanded', expanded ? 'true' : 'false');
      if (submenu) submenu.hidden = !expanded;
    }

    setExpanded(hasActiveChild || group.dataset.group === 'front-office');

    if (groupToggle) {
      groupToggle.addEventListener('click', function () {
        setExpanded(!group.classList.contains('expanded'));
      });
    }
  });

  document.addEventListener('click', function (event) {
    const target = event.target;
    const hrefHost = target.closest('[data-href]');
    if (hrefHost) {
      const interactive = target.closest('a, button, input, select, textarea, label');
      if (!interactive || interactive === hrefHost) {
        window.location.href = hrefHost.dataset.href;
      }
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

    const resetButton = target.closest('[data-action="reset-filters"]');
    if (resetButton) {
      const panel = resetButton.closest('[data-filter]') || resetButton.closest('form') || resetButton.closest('.crm-filter-panel');
      if (panel) {
        panel.querySelectorAll('input, select, textarea').forEach(function (field) {
          if (field.type === 'hidden' || field.type === 'submit' || field.type === 'button') {
            return;
          }
          if (field.tagName === 'SELECT') {
            field.selectedIndex = 0;
            return;
          }
          if (field.type === 'checkbox' || field.type === 'radio') {
            field.checked = false;
            return;
          }
          field.value = '';
        });
      }
      event.preventDefault();
    }
  });

  document.addEventListener('submit', function (event) {
    const form = event.target;
    if (form.matches('[data-form]')) {
      event.preventDefault();
    }
  });

  if (window.UIkit) {
    document.querySelectorAll('ul[uk-tab], .crm-tabs[uk-tab]').forEach(function (tab) {
      window.UIkit.tab(tab);
    });
  }
})();
