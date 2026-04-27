(function () {
  const app = document.querySelector('.crm-app');
  const toggle = document.querySelector('[data-sidebar-toggle]');
  if (toggle && app) {
    toggle.addEventListener('click', function () {
      app.classList.toggle('sidebar-open');
    });
  }

  const nav = document.querySelector('.crm-sidebar nav');
  if (!nav || nav.querySelector('.crm-nav-heading')) {
    return;
  }

  const links = Array.from(nav.querySelectorAll(':scope > .crm-nav-link'));
  if (!links.length) {
    return;
  }

  const addHeadingBefore = function (selector, title) {
    const target = nav.querySelector(selector);
    if (!target) {
      return;
    }
    const heading = document.createElement('div');
    heading.className = 'crm-nav-heading';
    heading.textContent = title;
    nav.insertBefore(heading, target);
  };

  addHeadingBefore('.crm-nav-link[href="dashboard.html"]', 'Фронт-офис');
  addHeadingBefore('.crm-nav-link[href="middle-office-clients.html"]', 'Мидл-офис');
  addHeadingBefore('.crm-nav-link[href="administration.html"]', 'Система');
})();
