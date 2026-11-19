/* Front-page film. Once the page has loaded, the loop plays behind the opening:
   the launch, then the arm holding a spinning magnet just off the hull. */
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

  // The portrait cut on portrait screens, the 720 cut on small landscape ones, the 1080 cut on the rest.
  const hero = document.querySelector('.horizon-intro');
  const loop = hero && hero.querySelector('.hero-film video');
  let heroNear = false, heroCut = '';
  function heroSync() {
    if (!loop) return;
    if (!heroNear || still()) { loop.pause(); return; }
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
})();
