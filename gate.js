(() => {
  'use strict';
  // Shared-password lock for the Arago V1.1 pages and the whitepaper. Only the
  // SHA-256 of the password is stored here. This runs in the browser, so it keeps
  // casual visitors out; it does not hide the files from someone reading the repo.
  const HASH = '01e6752358f85f5af8733298253f7c16df22eabbb6459e8a33a4cb013b84cdc8';
  const KEY = 'vyper-access';

  let stored = null;
  try { stored = localStorage.getItem(KEY); } catch {}
  if (stored === HASH) return;

  const mark = new URL('assets/vyper/vyper-mark.png', document.currentScript.src).href;
  const home = new URL('index.html', document.currentScript.src).href;
  const root = document.documentElement;
  root.classList.add('vg-locked');

  const style = document.createElement('style');
  style.textContent = `
    html.vg-locked, html.vg-locked body { overflow: hidden !important; background: #000 !important; }
    html.vg-locked body > :not(.vg-gate) { display: none !important; }
    .vg-gate { position: fixed; inset: 0; z-index: 2147483647; display: grid; place-items: center; padding: 24px 16px; background: #000; color: #f2f6fa; font-family: "Helvetica Neue", Helvetica, Arial, sans-serif; }
    .vg-gate * { box-sizing: border-box; }
    .vg-mark { position: absolute; left: 50%; top: 50%; width: min(78vh, 86vw); aspect-ratio: 800 / 912; transform: translate(-50%, -50%); background: linear-gradient(180deg, #fff 0%, rgba(210, 222, 236, .7) 45%, rgba(255, 255, 255, .08) 100%); -webkit-mask: url("${mark}") center / contain no-repeat; mask: url("${mark}") center / contain no-repeat; opacity: .07; pointer-events: none; }
    .vg-card { position: relative; width: min(380px, 100%); padding: 34px 30px 26px; border: 1px solid #ffffff1f; border-radius: 14px; background: rgba(12, 14, 18, .72); -webkit-backdrop-filter: blur(18px); backdrop-filter: blur(18px); box-shadow: 0 30px 80px rgba(0, 0, 0, .6); }
    .vg-eyebrow { margin: 0 0 14px; font-size: 10px; line-height: 1.5; letter-spacing: .1em; font-weight: 600; color: #a2a7ac; }
    .vg-card h1 { margin: 0 0 24px; font-size: 22px; font-weight: 400; letter-spacing: -.03em; line-height: 1.25; color: #f2f6fa; }
    .vg-card label { display: block; margin-bottom: 8px; font-size: 11px; color: #8fa3b6; }
    .vg-card input { display: block; width: 100%; padding: 13px 14px; border: 1px solid #ffffff2e; border-radius: 8px; background: #05070a; color: #fff; font: 15px/1.2 "Helvetica Neue", Helvetica, Arial, sans-serif; outline: none; transition: border-color .2s; }
    .vg-card input:focus { border-color: #ffffff88; }
    .vg-card button { display: block; width: 100%; margin-top: 14px; padding: 13px 14px; border: 0; border-radius: 8px; background: #f2f6fa; color: #000; font-family: inherit; font-size: 13px; font-weight: 600; line-height: 1; letter-spacing: .02em; cursor: pointer; transition: background .2s; }
    .vg-card button:hover { background: #fff; }
    .vg-card button:focus-visible, .vg-card a:focus-visible { outline: 2px solid #fff; outline-offset: 3px; }
    .vg-error { margin: 12px 0 0; font-size: 12px; color: #ff9b8f; }
    .vg-error:empty { display: none; }
    .vg-foot { display: flex; justify-content: space-between; gap: 16px; margin-top: 24px; padding-top: 18px; border-top: 1px solid #ffffff14; font-size: 11px; }
    .vg-foot a { color: #a2a7ac; text-decoration: none; transition: color .2s; }
    .vg-foot a:hover { color: #fff; }`;
  document.head.appendChild(style);

  async function sha256(text) {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
  }

  function build() {
    const gate = document.createElement('div');
    gate.className = 'vg-gate';
    gate.innerHTML = `
      <div class="vg-mark" aria-hidden="true"></div>
      <main class="vg-card" role="dialog" aria-modal="true" aria-labelledby="vg-title">
        <p class="vg-eyebrow">ARAGO V1.1 · RESTRICTED</p>
        <h1 id="vg-title">Enter the password</h1>
        <form>
          <label for="vg-password">Password</label>
          <input id="vg-password" type="password" autocomplete="current-password" required autofocus>
          <p class="vg-error" role="alert"></p>
          <button type="submit">Continue</button>
        </form>
        <nav class="vg-foot"><a href="${home}">← Vyper Space</a><a href="mailto:tamerlan.goglichidze@yale.edu?subject=Vyper%20Space%20access">Request access</a></nav>
      </main>`;
    document.body.appendChild(gate);

    const form = gate.querySelector('form');
    const input = gate.querySelector('input');
    const error = gate.querySelector('.vg-error');
    input.focus();
    form.addEventListener('submit', async event => {
      event.preventDefault();
      error.textContent = '';
      if (await sha256(input.value) !== HASH) {
        error.textContent = 'Incorrect password.';
        input.select();
        return;
      }
      try {
        localStorage.setItem(KEY, HASH);
        // Reload so the page's 3D views initialize at full size.
        location.reload();
      } catch {
        // Storage blocked (e.g. private mode): unlock this page view only.
        root.classList.remove('vg-locked');
        gate.remove();
        style.remove();
        window.dispatchEvent(new Event('resize'));
      }
    });
  }

  if (document.body) build();
  else document.addEventListener('DOMContentLoaded', build);
})();
