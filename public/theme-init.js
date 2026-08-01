// Applies the saved appearance before first paint so dark mode never flashes
// white. Kept as a separate file because the app's CSP disallows inline script.
(function () {
  try {
    var stored = localStorage.getItem('excitel-theme') || 'system';
    var dark =
      stored === 'dark' ||
      (stored === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.classList.add(dark ? 'dark' : 'light');
    document.documentElement.style.backgroundColor = dark ? '#080d10' : '#e8ecef';
  } catch (e) {
    /* no storage available — the app applies the theme on mount */
  }
})();
