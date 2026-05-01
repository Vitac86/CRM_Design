(function () {
  if (!document.body || document.body.getAttribute('data-page') !== 'trading-card') return;

  /* ─── Toast ─────────────────────────────────────────────────────────────── */

  function showToast(msg) {
    var toast = document.createElement('div');
    toast.className = 'crm-trading-toast';
    toast.textContent = msg;
    document.body.appendChild(toast);
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        toast.classList.add('is-visible');
      });
    });
    setTimeout(function () {
      toast.classList.remove('is-visible');
      setTimeout(function () {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 250);
    }, 2800);
  }

  /* ─── Password reset modal ──────────────────────────────────────────────── */

  function getPasswordModal() {
    return document.querySelector('[data-role="terminal-password-modal"]');
  }

  function openPasswordModal() {
    var modal = getPasswordModal();
    if (!modal) return;
    modal.hidden = false;
    document.body.classList.add('crm-modal-open');
  }

  function closePasswordModal() {
    var modal = getPasswordModal();
    if (!modal) return;
    modal.hidden = true;
    document.body.classList.remove('crm-modal-open');
  }

  /* ─── Event delegation ──────────────────────────────────────────────────── */

  document.addEventListener('click', function (e) {
    var target = e.target;

    /* Выдать терминал */
    if (target.closest('[data-action="issue-terminal"]')) {
      e.preventDefault();
      showToast('Выдача терминала добавлена как заглушка');
      return;
    }

    /* Редактировать параметры */
    if (target.closest('[data-action="edit-trading-params"]')) {
      e.preventDefault();
      showToast('Редактирование параметров будет доступно в следующем шаге');
      return;
    }

    /* Обновить пароль — open modal */
    if (target.closest('[data-action="reset-terminal-password"]')) {
      e.preventDefault();
      openPasswordModal();
      return;
    }

    /* Modal: close via backdrop or close button */
    if (target.closest('[data-action="close-terminal-password-modal"]')) {
      e.preventDefault();
      closePasswordModal();
      return;
    }

    /* Modal: confirm password reset */
    if (target.closest('[data-action="confirm-terminal-password"]')) {
      e.preventDefault();
      closePasswordModal();
      showToast('Пароль обновлён');
      return;
    }
  });

  /* Close modal on Escape */
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      var modal = getPasswordModal();
      if (modal && !modal.hidden) {
        closePasswordModal();
      }
    }
  });
}());
