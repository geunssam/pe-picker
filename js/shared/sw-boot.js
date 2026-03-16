/* ============================================
   PE Picker - Service Worker Bootstrap
   - Capacitor 네이티브 앱: SW 비활성화 + 캐시 정리
   - localhost: unregister SW and clear app caches
   - production: register SW
   ============================================ */

if ('serviceWorker' in navigator) {
  const host = window.location.hostname;
  const isLocalDev = host === 'localhost' || host === '127.0.0.1' || host === '[::1]';
  const isNativeApp = window.Capacitor?.isNativePlatform?.() ?? false;

  try {
    if (isNativeApp || isLocalDev) {
      // 네이티브 앱/로컬: SW 해제 + 캐시 정리 (캐시 충돌 방지)
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map(registration => registration.unregister()));

      if ('caches' in window) {
        const keys = await caches.keys();
        const targets = keys.filter(key => key.startsWith('pe-picker-'));
        await Promise.all(targets.map(key => caches.delete(key)));
      }
    } else {
      await navigator.serviceWorker.register('./sw.js');
    }
  } catch (error) {
    console.warn('[SW] bootstrap error:', error);
  }
}
