// Applies the saved appearance before first paint so dark mode never flashes
// white. This source is bundled to public/theme-init.js as a classic script.
(() => {
  try {
    const stored = localStorage.getItem('excitel-theme') ?? 'system';
    const dark =
      stored === 'dark' ||
      (stored === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.classList.add(dark ? 'dark' : 'light');
    document.documentElement.style.backgroundColor = dark ? '#080d10' : '#e8ecef';
  } catch {
    // No storage available — the app applies the theme on mount.
  }
})();
