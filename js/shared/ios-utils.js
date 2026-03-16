/* ============================================
   PE Picker - iOS / PWA / Capacitor Utilities
   Safe Area, 햅틱, PWA 설치 안내, 플랫폼 감지
   ============================================ */

const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
const isPWA =
  window.navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches;

/** Capacitor 네이티브 앱 여부 */
const isNativeApp = () => window.Capacitor?.isNativePlatform?.() ?? false;

/** 현재 플랫폼 ('web' | 'ios' | 'android') */
const getPlatform = () => window.Capacitor?.getPlatform?.() ?? 'web';

function init() {
  if (isIOS) {
    document.documentElement.classList.add('ios');
  }
  if (isPWA) {
    document.documentElement.classList.add('pwa');
  }

  // 터치 피드백
  document.addEventListener(
    'touchstart',
    e => {
      const btn = e.target.closest('.btn, .dock-item, .stepper-btn, .glass-card-interactive');
      if (btn) {
        btn.style.transform = 'scale(0.96)';
      }
    },
    { passive: true }
  );

  document.addEventListener(
    'touchend',
    () => {
      document
        .querySelectorAll('.btn, .dock-item, .stepper-btn, .glass-card-interactive')
        .forEach(el => {
          el.style.transform = '';
        });
    },
    { passive: true }
  );
}

// 햅틱 피드백 (Capacitor 네이티브 우선)
async function haptic(style = 'light') {
  if (isNativeApp()) {
    try {
      const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
      const styleMap = {
        light: ImpactStyle.Light,
        medium: ImpactStyle.Medium,
        heavy: ImpactStyle.Heavy,
      };
      await Haptics.impact({ style: styleMap[style] || ImpactStyle.Light });
      return;
    } catch {
      /* 플러그인 미설치 시 fallback */
    }
  }
  // 웹 fallback
  if (navigator.vibrate) {
    const patterns = { light: [10], medium: [20], heavy: [40] };
    navigator.vibrate(patterns[style] || [10]);
  }
}

document.addEventListener('DOMContentLoaded', init);

export const IosUtils = { isIOS, isPWA, isNativeApp, getPlatform, haptic };
