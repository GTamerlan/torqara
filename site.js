const navToggle = document.querySelector('.nav-toggle');
const navLinks = document.querySelector('.nav-links');
const header = document.querySelector('.site-header');
if (navToggle && navLinks) {
  const closeMenu = () => { navToggle.setAttribute('aria-expanded', 'false'); navToggle.setAttribute('aria-label', 'Open navigation'); navLinks.classList.remove('is-open'); };
  navToggle.addEventListener('click', () => { const open = navToggle.getAttribute('aria-expanded') !== 'true'; navToggle.setAttribute('aria-expanded', String(open)); navToggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation'); navLinks.classList.toggle('is-open', open); });
  navLinks.addEventListener('click', event => { if (event.target.closest('a')) closeMenu(); });
  document.addEventListener('keydown', event => { if (event.key === 'Escape') { const wasOpen = navToggle.getAttribute('aria-expanded') === 'true'; closeMenu(); if (wasOpen) navToggle.focus(); } });
  window.matchMedia('(min-width:921px)').addEventListener('change', event => { if (event.matches) closeMenu(); });
}
if (header) {
  const updateHeader = () => header.classList.toggle('is-scrolled', window.scrollY > 40);
  window.addEventListener('scroll', updateHeader, { passive: true });
  updateHeader();
}
