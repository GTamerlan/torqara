/* Front-page films. The launch loop plays behind the opening once the page has loaded,
   "Watch the film" opens the full film, and the scroll sets the time of the detumble film. */
(() => {
  'use strict';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const portrait = matchMedia('(orientation: portrait)');
  const small = matchMedia('(max-width: 1024px), (max-height: 600px)');
  const saveData = Boolean(navigator.connection && navigator.connection.saveData);
  const still = () => reduce.matches || saveData;
  const listen = (query, fn) => (query.addEventListener ? query.addEventListener('change', fn) : query.addListener(fn));
  const afterLoad = fn => (document.readyState === 'complete' ? setTimeout(fn, 250) : addEventListener('load', () => setTimeout(fn, 250), { once: true }));
  const quiet = promise => { if (promise) promise.catch(() => {}); };

  // Each film in the formats it has, the lighter first; the browser plays the first it can.
  function use(video, base) {
    const kinds = (video.dataset.formats || 'webm mp4').split(' ');
    video.replaceChildren(...kinds.map(kind => {
      const source = document.createElement('source');
      source.src = base + '.' + kind;
      source.type = kind === 'webm' ? 'video/webm; codecs="vp9"' : 'video/mp4';
      return source;
    }));
    video.load();
  }

  // Opening: the portrait cut on portrait screens, the 720 loop on small landscape ones, the 1080 loop on the rest.
  const hero = document.querySelector('.horizon-intro');
  const loop = hero && hero.querySelector('.hero-film video');
  const viewer = document.querySelector('.film-viewer');
  let heroNear = false, heroCut = '';
  function heroSync() {
    if (!loop) return;
    if (!heroNear || still() || (viewer && viewer.open)) { loop.pause(); return; }
    const cut = portrait.matches ? loop.dataset.portrait : small.matches ? loop.dataset.small : loop.dataset.landscape;
    if (cut !== heroCut) {
      heroCut = cut;
      loop.classList.remove('is-on');
      use(loop, cut);
    }
    quiet(loop.play());
  }
  if (loop) {
    loop.addEventListener('playing', () => loop.classList.add('is-on'));
    const near = new IntersectionObserver(entries => { heroNear = entries[entries.length - 1].isIntersecting; heroSync(); }, { rootMargin: '200px 0px' });
    afterLoad(() => near.observe(hero));
    listen(portrait, () => { if (heroCut) heroSync(); });
    listen(small, () => { if (heroCut) heroSync(); });
    listen(reduce, heroSync);
  }

  // The full film, with its own controls.
  const watch = document.querySelector('[data-film-watch]');
  if (viewer && watch && typeof viewer.showModal === 'function') {
    const film = viewer.querySelector('video');
    let pressedOutside = false;
    watch.setAttribute('aria-haspopup', 'dialog');
    watch.addEventListener('click', event => {
      // A new tab or window still gets the film file itself.
      if (event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      if (!film.firstElementChild) {
        film.poster = viewer.dataset.poster;
        use(film, viewer.dataset.film);
      } else {
        film.currentTime = 0;
      }
      viewer.showModal();
      heroSync();
      quiet(film.play());
    });
    viewer.querySelector('[data-film-close]').addEventListener('click', () => viewer.close());
    viewer.addEventListener('pointerdown', event => { pressedOutside = event.target === viewer; });
    viewer.addEventListener('click', event => { if (pressedOutside && event.target === viewer) viewer.close(); });
    viewer.addEventListener('close', () => { film.pause(); heroSync(); });
  }

  // Detumble: the scroll sets the film's time and the four lines step in with it.
  const scrub = document.querySelector('.film-scrub');
  const clip = scrub && scrub.querySelector('video[data-film]');
  const list = scrub && scrub.querySelector('.film-lines');
  if (!scrub || !clip || !list) return;
  const lines = [...list.querySelectorAll('[data-at]')];
  const starts = lines.map(line => Number(line.dataset.at) || 0);
  const times = lines.map(line => Number(line.dataset.t) || 0);
  let mode = '', active = -1, loading = false, ready = false, have = -1, frame = 0;
  list.hidden = false;

  function progress() {
    const box = scrub.getBoundingClientRect();
    return Math.min(1, Math.max(0, -box.top / Math.max(1, box.height - innerHeight)));
  }
  // Each line has its own stretch of scroll, and the film runs through that line's part of the story.
  function timeAt(p, end) {
    let i = 0;
    while (i < starts.length - 1 && p >= starts[i + 1]) i++;
    const p0 = starts[i], p1 = i + 1 < starts.length ? starts[i + 1] : 1;
    const t0 = times[i], t1 = i + 1 < times.length ? times[i + 1] : end;
    return Math.min(end, t0 + (t1 - t0) * Math.min(1, Math.max(0, (p - p0) / Math.max(.001, p1 - p0))));
  }
  function update() {
    frame = 0;
    if (mode !== 'scrub') return;
    const p = progress();
    let k = 0;
    starts.forEach((start, i) => { if (p >= start) k = i; });
    if (k !== active) {
      active = k;
      lines.forEach((line, i) => line.classList.toggle('is-on', i === k));
    }
    if (!ready) return;
    if (clip.seeking) { frame = requestAnimationFrame(update); return; }
    const end = Number.isFinite(clip.duration) ? clip.duration - .05 : times[times.length - 1];
    const want = timeAt(p, end);
    const first = have < 0;
    if (first || Math.abs(want - have) < 1 / 48) have = want;
    else have += (want - have) * .35;
    if (first || Math.abs(clip.currentTime - have) > 1 / 96) clip.currentTime = have;
    if (have !== want) frame = requestAnimationFrame(update);
  }
  const ask = () => { if (!frame) frame = requestAnimationFrame(update); };

  function load() {
    if (loading || mode !== 'scrub') return;
    loading = true;
    clip.preload = 'auto';
    clip.addEventListener('loadeddata', () => {
      ready = true;
      clip.pause();
      clip.addEventListener('seeked', () => clip.classList.add('is-on'), { once: true });
      have = -1;
      ask();
    }, { once: true });
    use(clip, clip.dataset.film);
    // Some phones fetch frames only once asked to play.
    const kick = clip.play();
    if (kick) kick.then(() => { clip.pause(); ask(); }).catch(() => {});
  }
  const near = new IntersectionObserver(entries => {
    if (entries.some(entry => entry.isIntersecting)) { near.disconnect(); load(); }
  }, { rootMargin: '0px 0px -15% 0px' });

  function setMode() {
    const next = still() ? 'still' : 'scrub';
    if (next === mode) return;
    mode = next;
    scrub.classList.toggle('is-scrubbing', mode === 'scrub');
    if (mode === 'scrub') {
      active = -1;
      have = -1;
      if (!loading) afterLoad(() => { if (mode === 'scrub' && !loading) near.observe(scrub); });
      ask();
    } else {
      near.disconnect();
      clip.pause();
    }
  }
  setMode();
  listen(reduce, setMode);
  addEventListener('scroll', ask, { passive: true });
  addEventListener('resize', ask, { passive: true });
})();
