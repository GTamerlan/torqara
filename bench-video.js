// The bench rig's turn: the poster first, the video once the page has loaded (the smaller cut on phones),
// playing only while it is on screen. Reduced motion and Save-Data keep the poster.
(() => {
  const v = document.querySelector('.bt-video');
  if (!v) return;
  const c = navigator.connection;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches || (c && c.saveData)) return;
  const small = matchMedia('(max-width: 760px)').matches;
  let started = false, inView = false, loaded = document.readyState === 'complete';
  const sync = () => {
    if (!started) return;
    if (inView && !document.hidden) { const p = v.play(); if (p && p.catch) p.catch(() => {}); } else v.pause();
  };
  const go = () => {
    if (!started && loaded && inView) { started = true; v.src = small ? v.dataset.srcSmall : v.dataset.src; }
    sync();
  };
  new IntersectionObserver((list) => { for (const e of list) inView = e.isIntersecting; go(); }, { threshold: 0.2 }).observe(v);
  if (!loaded) addEventListener('load', () => { loaded = true; go(); }, { once: true });
  document.addEventListener('visibilitychange', sync);
})();
