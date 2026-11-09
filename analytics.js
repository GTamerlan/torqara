/* Optional Vyper analytics. The collection ID is public; the dashboard is private. */
(() => {
  'use strict';
  const WEBSITE_ID = 'b972b563-41c8-4d8a-ae79-17c38145c0de'; // Public collection ID only. NEVER an API key or dashboard share token.
  const SCRIPT_URL = 'https://cloud.umami.is/script.js'; // Copy the official script URL from the Umami dashboard.
  const HOSTS = new Set(['vyperspace.com', 'www.vyperspace.com']);
  const PREF = 'vyper-analytics-consent-v1';
  const allowedPaths = new Set(['/', '/index.html', '/about.html', '/prototype.html', '/explorer.html', '/references.html', '/whitepaper.html', '/privacy.html']);
  const allowedEvents = new Set(['whitepaper_opened', 'contact_clicked']);
  let enabled = false;
  let loaded = false;
  let opened = false;
  let observer;
  if (!HOSTS.has(location.hostname) || !/^[0-9a-f-]{36}$/i.test(WEBSITE_ID) || !SCRIPT_URL.startsWith('https://')) return;
  if (navigator.globalPrivacyControl || navigator.doNotTrack === '1' || window.doNotTrack === '1') return;
  let preference;
  try { preference = localStorage.getItem(PREF); } catch {}
  function payload(name) {
    const path = allowedPaths.has(location.pathname) ? location.pathname : '/other';
    const campaign = new URLSearchParams(location.search).get('utm_campaign');
    // Only opaque, predefined outreach labels are accepted; never names or email addresses.
    const url = path + (/^vc-[0-9]{3}$/.test(campaign || '') ? '?utm_source=outreach&utm_campaign=' + campaign : '');
    let referrer = '';
    try { const ref = new URL(document.referrer); if (['http:', 'https:'].includes(ref.protocol)) referrer = ref.origin; } catch {}
    const data = { website: WEBSITE_ID, hostname: location.hostname, url, referrer, title: path === '/whitepaper.html' ? 'Whitepaper' : 'Vyper Space' };
    if (allowedEvents.has(name)) data.name = name;
    return data;
  }
  function track(name) {
    if (!enabled || !loaded || !window.umami || typeof window.umami.track !== 'function') return;
    // Explicit payload avoids default title, URL/query, screen, and referrer leakage.
    try { Promise.resolve(window.umami.track(payload(name))).catch(() => {}); } catch {}
  }
  function checkWhitepaper() {
    if (!opened && location.pathname === '/whitepaper.html' && !document.documentElement.classList.contains('vg-locked')) {
      opened = true;
      track('whitepaper_opened');
    }
  }
  function start() {
    enabled = true;
    if (loaded) {
      opened = false; track(); checkWhitepaper();
      observer = new MutationObserver(checkWhitepaper);
      observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
      return;
    }
    if (document.getElementById('vyper-umami')) return;
    const script = document.createElement('script');
    script.referrerPolicy = 'origin';
    script.id = 'vyper-umami'; script.defer = true; script.src = SCRIPT_URL;
    script.setAttribute('data-website-id', WEBSITE_ID);
    script.setAttribute('data-auto-track', 'false');
    script.setAttribute('data-auto-pageview', 'false');
    script.setAttribute('data-domains', [...HOSTS].join(','));
    script.setAttribute('data-do-not-track', 'true');
    script.onload = () => {
      loaded = true;
      if (!enabled) return;
      track(); checkWhitepaper();
      observer = new MutationObserver(checkWhitepaper);
      observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    };
    script.onerror = () => { script.remove(); };
    document.head.appendChild(script);
  }
  function choose(value) {
    try { localStorage.setItem(PREF, value); } catch {}
    if (value === 'yes') start();
    else { enabled = false; if (observer) observer.disconnect(); }
  }
  function showChoices() {
    if (document.getElementById('vyper-analytics-choice')) return;
    const box = document.createElement('aside');
    box.id = 'vyper-analytics-choice';
    box.setAttribute('aria-label', 'Optional analytics');
    box.style.cssText = 'position:fixed;bottom:16px;left:16px;right:16px;max-width:560px;z-index:2147483647;padding:18px;background:#121820;color:#fff;border:1px solid #64748b;border-radius:10px;font:14px/1.5 system-ui;box-shadow:0 4px 24px #0008';
    const text = document.createElement('p');
    text.textContent = 'Allow optional analytics? Umami helps Vyper understand page visits, referral sources and approximate location. We do not collect names, emails or record your screen. You can change this choice in Privacy.';
    box.appendChild(text);
    const details = document.createElement('a'); details.href = 'privacy.html'; details.textContent = 'Read our privacy notice'; details.style.cssText = 'display:block;color:#b9dbff;margin:8px 0'; box.appendChild(details);
    for (const [label, value] of [['Allow analytics', 'yes'], ['No thanks', 'no']]) {
      const button = document.createElement('button'); button.type = 'button'; button.textContent = label;
      button.style.cssText = 'padding:8px 12px;margin:4px 8px 0 0;border:1px solid #94a3b8;border-radius:5px;background:#fff;color:#111;cursor:pointer';
      button.addEventListener('click', () => { choose(value); box.remove(); }); box.appendChild(button);
    }
    document.body.appendChild(box);
  }
  const footer = document.querySelector('.site-footer nav, .orbit-footer nav');
  if (footer) {
    const privacy = document.createElement('button'); privacy.type = 'button'; privacy.textContent = 'Analytics choices';
    privacy.style.cssText = 'font:inherit;color:inherit;background:none;border:0;padding:0;cursor:pointer';
    privacy.addEventListener('click', showChoices); footer.appendChild(privacy);
  }
  document.addEventListener('click', event => {
    const link = event.target.closest && event.target.closest('a[href^="mailto:"]');
    if (link) track('contact_clicked'); // No address, message or form content is sent.
  });
  if (preference === 'yes') start();
  else if (preference !== 'no') showChoices();
})();
