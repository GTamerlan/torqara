(() => {
  'use strict';
  // Native anchors, history and details. The model remains an independent document.
  document.querySelectorAll('a[href="#model-method"]').forEach(link => {
    link.addEventListener('click', () => {
      const method = document.getElementById('model-method');
      if (method) method.open = true;
    });
  });
})();
