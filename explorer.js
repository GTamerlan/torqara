(() => {
  'use strict';
  // Native anchors, history and details. The model remains an independent document.
  const openAnchorDetails = () => {
    const id = location.hash.slice(1);
    if (id !== 'model-method' && id !== 'report-review') return;
    const detail = document.getElementById(id);
    if (detail) detail.open = true;
  };
  document.querySelectorAll('a[href="#model-method"],a[href="#report-review"]').forEach(link => {
    link.addEventListener('click', () => {
      const method = document.getElementById(link.hash.slice(1));
      if (method) method.open = true;
    });
  });
  window.addEventListener('hashchange', openAnchorDetails);
  openAnchorDetails();
})();
