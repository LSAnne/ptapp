// js/build-info.js
(function () {
  const el = document.getElementById('buildStamp');
  if (!el) return;

  // 1) Build/version label: change this whenever you want to “bust” caches
  const BUILD_VERSION = 'dev-' + new Date().toISOString().slice(0,19).replace('T',' ');
  // If you prefer a fixed label you control, replace the line above with:
  // const BUILD_VERSION = 'v13 (2025‑08‑06 12:10)';

  // 2) Page last modified (from the file the browser actually loaded)
  const lastMod = document.lastModified || 'unknown';

  // 3) Service Worker status (to see if one is still controlling the page)
  let swStatus = 'no sw';
  if ('serviceWorker' in navigator) {
    if (navigator.serviceWorker.controller) {
      const s = navigator.serviceWorker.controller.state;
      swStatus = `sw: ${s}`;
    }
  }

  el.textContent = `Build: ${BUILD_VERSION} · Last modified: ${lastMod} · ${swStatus}`;
})();