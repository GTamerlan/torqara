(() => {
  'use strict';
  // Founder cards open a side panel; Escape, the close button or a backdrop click dismisses it.
  document.querySelectorAll('[data-founder]').forEach(card => {
    const panel = document.getElementById(card.dataset.founder);
    if (!panel || typeof panel.showModal !== 'function') return;
    card.addEventListener('click', () => panel.showModal());
    panel.querySelector('.founder-close').addEventListener('click', () => panel.close());
    panel.addEventListener('click', event => { if (event.target === panel) panel.close(); });
    panel.addEventListener('close', () => card.focus());
  });
})();
