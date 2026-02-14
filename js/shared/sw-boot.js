/* ============================================
   PE Picker - Service Worker Bootstrap
   - localhost: unregister SW and clear app caches
   - production: register SW
   ============================================ */

(async () => {
  if (!('serviceWorker' in navigator)) return;

  const host = window.location.hostname;
  const isLocalDev = host === 'localhost' || host === '127.0.0.1' || host === '[::1]';

  try {
    if (isLocalDev) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map(registration => registration.unregister()));

      if ('caches' in window) {
        const keys = await caches.keys();
        const targets = keys.filter(key => key.startsWith('pe-picker-'));
        await Promise.all(targets.map(key => caches.delete(key)));
      }

      return;
    }

    await navigator.serviceWorker.register('./sw.js');
  } catch (error) {
    console.warn('[SW] bootstrap error:', error);
  }
})();
