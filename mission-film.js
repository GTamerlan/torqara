/* About page: the mission film. The loop plays muted while it is near the screen (the upright cut on phones,
   the 720 cut on small screens, the 1080 cut on the rest); a tap opens the full film from the start. */
(() => {
  'use strict';
  const section = document.querySelector('.about-mission');
  if (!section) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const phone = matchMedia('(orientation: portrait) and (max-width: 600px)');
  const small = matchMedia('(max-width: 1024px), (max-height: 600px)');
  const wide = matchMedia('(min-width: 1100px) and (min-height: 700px)');
  const saveData = Boolean(navigator.connection && navigator.connection.saveData);
  const still = () => reduce.matches || saveData;
  const listen = (query, fn) => (query.addEventListener ? query.addEventListener('change', fn) : query.addListener(fn));
  const quiet = promise => { if (promise) promise.catch(() => {}); };

  // The film in both formats, the lighter first; the browser plays the first it can.
  function use(video, base) {
    video.replaceChildren(...['webm', 'mp4'].map(kind => {
      const source = document.createElement('source');
      source.src = base + '.' + kind;
      source.type = kind === 'webm' ? 'video/webm; codecs="vp9"' : 'video/mp4';
      return source;
    }));
    video.load();
  }

  const frame = section.querySelector('.mission-film');
  const loop = frame && frame.querySelector('video');
  const dialog = section.querySelector('.mission-full');
  const full = dialog && dialog.querySelector('video');
  let near = false, cut = '', watching = false, opener = null;

  function sync() {
    if (!loop) return;
    if (!near || watching || still()) { loop.pause(); return; }
    const want = phone.matches ? loop.dataset.portrait : small.matches ? loop.dataset.small : loop.dataset.landscape;
    if (want !== cut) {
      cut = want;
      loop.classList.remove('is-on');
      use(loop, want);
    }
    quiet(loop.play());
  }
  if (loop) {
    loop.addEventListener('playing', () => loop.classList.add('is-on'));
    new IntersectionObserver(entries => { near = entries[entries.length - 1].isIntersecting; sync(); }, { rootMargin: '200px 0px' }).observe(frame);
    listen(phone, () => { if (cut) sync(); });
    listen(small, () => { if (cut) sync(); });
    listen(reduce, sync);
  }

  // The full film: loaded only when asked for, from the start, in its own window.
  if (!dialog || !full) return;
  function open(event) {
    opener = event.currentTarget;
    if (typeof dialog.showModal !== 'function') { location.href = full.dataset.narrow + '.mp4'; return; }
    if (!full.dataset.cut) { full.dataset.cut = wide.matches ? full.dataset.wide : full.dataset.narrow; use(full, full.dataset.cut); }
    watching = true;
    sync();
    dialog.showModal();
    try { full.currentTime = 0; } catch (error) {}
    quiet(full.play());
  }
  section.querySelectorAll('[data-full-film]').forEach(button => button.addEventListener('click', open));
  dialog.querySelector('.mission-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
  dialog.addEventListener('close', () => {
    full.pause();
    watching = false;
    sync();
    if (opener) opener.focus();
  });
})();
