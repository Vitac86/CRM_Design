(function () {
  const subjectCardPage = document.body && document.body.getAttribute('data-page') === 'subject-card'
    ? document.body
    : document.querySelector('.crm-page[data-page="subject-card"]');

  if (!subjectCardPage) {
    return;
  }

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
      setRepresentativeModalState(false);
    }
  });

  document.addEventListener('click', function (event) {
    const target = event.target;

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
    }
  });

  document.addEventListener('change', function (event) {
    if (event.target.matches('[data-action="toggle-representative-expiry"]')) {
      syncRepresentativeExpiry();
    }
  });

  syncRepresentativeExpiry();
})();
