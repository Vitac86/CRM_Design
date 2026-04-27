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
      group.classList.toggle('active', expanded || hasActiveChild);
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
})();
