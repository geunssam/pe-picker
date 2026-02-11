/* ============================================
   PE Picker - iOS / PWA Utilities
   Safe Area, 햅틱, PWA 설치 안내
   ============================================ */

const IosUtils = (() => {

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isPWA = window.navigator.standalone === true ||
                window.matchMedia('(display-mode: standalone)').matches;

  function init() {
    if (isIOS) {
      document.documentElement.classList.add('ios');
    }
    if (isPWA) {
      document.documentElement.classList.add('pwa');
    }

    // 터치 피드백
    document.addEventListener('touchstart', (e) => {
      const btn = e.target.closest('.btn, .dock-item, .stepper-btn, .glass-card-interactive');
      if (btn) {
        btn.style.transform = 'scale(0.96)';
      }
    }, { passive: true });

    document.addEventListener('touchend', () => {
      document.querySelectorAll('.btn, .dock-item, .stepper-btn, .glass-card-interactive').forEach(el => {
        el.style.transform = '';
      });
    }, { passive: true });
  }

  // 햅틱 피드백
  function haptic(style = 'light') {
    if (isIOS && window.webkit?.messageHandlers?.haptic) {
      window.webkit.messageHandlers.haptic.postMessage(style);
    }
    // Android / 기타
    if (navigator.vibrate) {
      const patterns = { light: [10], medium: [20], heavy: [40] };
      navigator.vibrate(patterns[style] || [10]);
    }
  }

  document.addEventListener('DOMContentLoaded', init);

  return { isIOS, isPWA, haptic };
})();
