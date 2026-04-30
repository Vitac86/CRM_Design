(function () {
  if (!document.body || document.body.getAttribute('data-page') !== 'contract-edit') return;

  function showToast(msg) {
    var toast = document.createElement('div');
    toast.className = 'crm-contract-edit-toast';
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
    }, 2200);
  }

  var saveBtn = document.querySelector('[data-action="contract-edit-save"]');
  if (saveBtn) {
    saveBtn.addEventListener('click', function (e) {
      e.preventDefault();
      showToast('Договор обновлён');
      setTimeout(function () {
        window.location.href = 'subject-card.html?tab=contracts';
      }, 1500);
    });
  }

  var draftBtn = document.querySelector('[data-action="contract-edit-draft"]');
  if (draftBtn) {
    draftBtn.addEventListener('click', function (e) {
      e.preventDefault();
      showToast('Черновик сохранён');
    });
  }

  var exportBtn = document.querySelector('[data-action="contract-edit-export"]');
  if (exportBtn) {
    exportBtn.addEventListener('click', function (e) {
      e.preventDefault();
      showToast('Заявление подготовлено к выгрузке');
    });
  }
})();
