const root = document.documentElement;
const journey = document.querySelector('.orbital-journey');
const stage = document.querySelector('.journey-stage');
const container = document.querySelector('#orbital-canvas');
const chapters = [...document.querySelectorAll('[data-chapter]')];
const markers = [...document.querySelectorAll('.journey-side [data-jump]')];
const pause = document.querySelector('[data-pause]');
const pauseLabel = document.querySelector('[data-pause-label]');
const number = document.querySelector('[data-scene-number]');
const previous = document.querySelector('[data-prev]');
const next = document.querySelector('[data-next]');
const explore = document.querySelector('[data-explore]');
const exploreLabel = document.querySelector('[data-explore-label]');
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const positions = markers.map(marker=>Number(marker.dataset.jump));
const contextObserver = new MutationObserver(() => {
  if (container.dataset.sceneState === 'context-lost') {
    root.classList.remove('scene-ready');
    document.querySelector('.journey-load').textContent = '3D paused while your browser restores its graphics. The engineering pages are still available.';
  } else if (container.dataset.sceneState === 'ready' && scene && openingComplete) {
    root.classList.add('scene-ready');
    document.querySelector('.journey-load').textContent = '';
  }
});
contextObserver.observe(container,{attributes:true,attributeFilter:['data-scene-state']});
let scene, openingComplete = false, paused = false, exploring = false, targetProgress = 0, active = -1, syncFrame = 0;
const clamp = value => Math.max(0, Math.min(1, value));
function chapterFor(p) {
  const index = positions.findIndex((position,i) => i < positions.length - 1 && p < (position + positions[i + 1]) / 2);
  return index < 0 ? positions.length - 1 : index;
}
function showCaption(p) {
  const i = chapterFor(p);
  root.style.setProperty('--journey-progress', String(p));
  number.textContent = `${String(i + 1).padStart(2,'0')} / ${String(positions.length).padStart(2,'0')}`;
  previous.disabled = i === 0; next.disabled = i === positions.length - 1;
  if (active === i) return;
  active = i; stage.dataset.caption = String(i);
  chapters.forEach((chapter, index) => {
    const on = index === i;
    chapter.classList.toggle('is-active', on); chapter.inert = !on || exploring;
    chapter.setAttribute('aria-hidden', String(!on || exploring));
  });
  markers.forEach((marker,index) => index === i ? marker.setAttribute('aria-current','step') : marker.removeAttribute('aria-current'));
}
function readScroll() {
  if(root.classList.contains('scene-error')) return;
  targetProgress = clamp(-journey.getBoundingClientRect().top / Math.max(1, journey.offsetHeight - innerHeight));
  scene?.setProgress(reduced.matches ? positions[chapterFor(targetProgress)] : targetProgress);
  if (!scene) showCaption(targetProgress);
}
function jump(p) {
  if(exploring) setExploring(false);
  const top = scrollY + journey.getBoundingClientRect().top;
  scrollTo({top: top + p * Math.max(1, journey.offsetHeight - innerHeight), behavior: reduced.matches || p === 0 ? 'instant' : 'smooth'});
  if(p === 0) {
    readScroll();
    // Finish a reset after any native smooth-scroll step already queued by the browser.
    requestAnimationFrame(()=>{scrollTo({top,behavior:'instant'});readScroll();});
  }
}
function sync() {
  const state = scene?.getState();
  const p = state?.progress ?? Number(container.dataset.sceneProgress || targetProgress);
  showCaption(p);
  syncFrame = requestAnimationFrame(sync);
}
function motionPreference() {
  root.classList.toggle('journey-reduced', reduced.matches);
  scene?.setReducedMotion(reduced.matches);
  pause.disabled = reduced.matches || exploring;
  pauseLabel.textContent = reduced.matches ? 'Still scenes' : paused ? 'Resume' : 'Pause';
  readScroll();
}
function setExploring(value) {
  if(!scene) return;
  exploring = Boolean(value);
  if(exploring) scrollTo({top:scrollY,left:scrollX,behavior:'instant'});
  scene.setExplore(exploring);
  root.classList.toggle('journey-exploring', exploring);
  explore.setAttribute('aria-pressed', String(exploring));
  exploreLabel.textContent = exploring ? 'Return to story' : 'Look around';
  document.querySelector('.journey-side').inert = exploring;
  pause.disabled = reduced.matches || exploring;
  active = -1;
  showCaption(scene.getState().progress);
  if(!exploring) readScroll();
}
root.classList.add('journey-enabled');
showCaption(0);
document.querySelectorAll('[data-jump]').forEach(button => button.addEventListener('click', () => jump(Number(button.dataset.jump))));
previous.addEventListener('click', () => jump(positions[Math.max(0, active - 1)]));
next.addEventListener('click', () => jump(positions[Math.min(positions.length - 1, active + 1)]));
explore.addEventListener('click',()=>setExploring(!exploring));
addEventListener('keydown', event=>{if(event.key==='Escape'&&exploring){setExploring(false);explore.focus();}});
document.querySelector('[data-replay]').addEventListener('click', () => {
  if(paused){paused=false;scene?.setPaused(false);root.classList.remove('journey-paused');pause.setAttribute('aria-pressed','false');motionPreference();}
  jump(0);
});
pause.addEventListener('click', () => {paused=!paused;scene?.setPaused(paused);root.classList.toggle('journey-paused',paused);pause.setAttribute('aria-pressed',String(paused));pauseLabel.textContent=paused?'Resume':'Pause';});
addEventListener('scroll',readScroll,{passive:true});
addEventListener('resize',()=>{scene?.resize();readScroll();},{passive:true});
reduced.addEventListener('change',motionPreference);
try {
  const { mountOrbitalScene } = await import('./orbital-scene.js?v=brand-8');
  scene = await mountOrbitalScene(container);
  scene.setPaused(paused);
  // Hold the opening horizon for three extra seconds after the 3D scene is ready.
  await new Promise(resolve => setTimeout(resolve, 3000));
  openingComplete = true;
  if (container.dataset.sceneState === 'ready') {
    root.classList.add('scene-ready');
    document.querySelector('.journey-load').textContent='';
  }
  explore.disabled = typeof scene.setExplore !== 'function';
  motionPreference(); readScroll(); sync();
  // Inspectable presentation state; this is scripted illustration, never a physics result.
  window.vyperJourney = {getState: () => scene.getState(), goTo: jump};
} catch(error) {
  root.classList.add('scene-error'); root.classList.remove('journey-enabled');
  container.dataset.sceneState='error';
  document.querySelector('.journey-load').textContent='3D is unavailable in this browser. The engineering explorer and prototype remain available.';
  showCaption(0);
  pause.disabled=true;previous.disabled=true;next.disabled=true;
  document.querySelectorAll('[data-jump],[data-replay]').forEach(button=>button.disabled=true);
  console.info('Vyper orbital illustration unavailable:', error.message);
}
addEventListener('pagehide', event => {if(!event.persisted){cancelAnimationFrame(syncFrame);contextObserver.disconnect();scene?.dispose();}});
addEventListener('pageshow', event => {if(event.persisted){scene?.resize();readScroll();}});
