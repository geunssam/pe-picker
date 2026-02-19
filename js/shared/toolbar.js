/* ============================================
   PE Picker - Toolbar + Drawer
   우측 3단계 툴바 + 좌측 슬라이드 드로어
   ============================================ */

import { Whistle } from './whistle.js';
import { QuickTimer } from './quick-timer.js';
import { UI } from './ui-utils.js';

// === DOM 참조 ===
let toolbar = null;
let toggleBtn = null;
let whistleBtn = null;
let timerBtn = null;

let drawer = null;
let overlay = null;
let hamburger = null;

// === 상태 ===
const isMobile = () => window.innerWidth <= 480;

function getState() {
  if (!toolbar) return 'minimized';
  if (toolbar.classList.contains('minimized')) return 'minimized';
  if (toolbar.classList.contains('collapsed')) return 'collapsed';
  return 'expanded';
}

function setState(state) {
  if (!toolbar) return;
  toolbar.classList.remove('minimized', 'collapsed');

  if (state === 'minimized') {
    toolbar.classList.add('minimized');
  } else if (state === 'collapsed') {
    toolbar.classList.add('collapsed');
  }
  // expanded = 클래스 없음

  // 화살표 방향 업데이트
  const iconSpan = toggleBtn?.querySelector('.toggle-icon');
  const textSpan = toggleBtn?.querySelector('.toggle-text');

  if (iconSpan) {
    if (state === 'expanded') {
      iconSpan.style.transform = 'rotate(180deg)'; // > (접기)
    } else {
      iconSpan.style.transform = 'rotate(0deg)'; // < (열기)
    }
  }
  if (textSpan) {
    textSpan.textContent = state === 'expanded' ? '접기' : '펼치기';
  }
}

function cycleToolbarState() {
  const current = getState();

  // 3단 순환: minimized → collapsed → expanded → minimized
  if (current === 'minimized') {
    setState('collapsed');
  } else if (current === 'collapsed') {
    setState('expanded');
  } else {
    setState('minimized');
  }
}

function initToolbarState() {
  if (isMobile()) {
    setState('minimized');
  } else {
    setState('collapsed');
  }
}

// === 드로어 ===
function openDrawer() {
  if (drawer) drawer.classList.add('open');
  if (overlay) overlay.classList.add('open');
}

function closeDrawer() {
  if (drawer) drawer.classList.remove('open');
  if (overlay) overlay.classList.remove('open');
}

// === 표시/숨김 ===
function show() {
  if (toolbar) toolbar.style.display = '';
}

function hide() {
  if (toolbar) toolbar.style.display = 'none';
  Whistle.closePanel();
  QuickTimer.closePanel();
}

// === 네비 활성 탭 동기화 ===
function syncActiveTab(route) {
  if (drawer) {
    drawer.querySelectorAll('.mobile-nav-item').forEach(item => {
      item.classList.toggle('active', item.dataset.route === route);
    });
  }
}

// === 초기화 ===
function init() {
  // 우측 툴바
  toolbar = document.getElementById('right-toolbar');
  toggleBtn = document.getElementById('toolbar-toggle');
  whistleBtn = document.getElementById('toolbar-whistle-btn');
  timerBtn = document.getElementById('toolbar-timer-btn');

  // 좌측 드로어
  drawer = document.getElementById('mobile-drawer');
  overlay = document.getElementById('mobile-drawer-overlay');
  hamburger = document.getElementById('navbar-hamburger');

  if (!toolbar) return;

  // 초기 상태 설정
  initToolbarState();

  // 토글 버튼
  if (toggleBtn) {
    toggleBtn.addEventListener('click', e => {
      e.stopPropagation();
      cycleToolbarState();
    });
  }

  // 휘슬 버튼
  if (whistleBtn) {
    whistleBtn.addEventListener('click', e => {
      e.stopPropagation();
      QuickTimer.closePanel();
      Whistle.togglePanel();
    });
  }

  // 타이머 버튼
  if (timerBtn) {
    timerBtn.addEventListener('click', e => {
      e.stopPropagation();
      Whistle.closePanel();
      QuickTimer.togglePanel();
    });
  }

  // === 우측 툴바 계정 버튼 ===
  const toolbarClassBtn = document.getElementById('toolbar-class-btn');
  if (toolbarClassBtn) {
    toolbarClassBtn.addEventListener('click', () => {
      window.App.goBackToLanding();
    });
  }

  const toolbarLogoutBtn = document.getElementById('toolbar-logout-btn');
  if (toolbarLogoutBtn) {
    toolbarLogoutBtn.addEventListener('click', async () => {
      const confirmed = await UI.showConfirm('로그아웃 하시겠습니까?', {
        confirmText: '로그아웃',
        cancelText: '취소',
        danger: true,
      });
      if (!confirmed) return;
      const landingLogout = document.getElementById('landing-logout-btn');
      if (landingLogout) {
        landingLogout.click();
      }
    });
  }

  // === 우측 툴바 배지 도구 ===
  const quickBadgeBtn = document.getElementById('toolbar-quick-badge-btn');
  if (quickBadgeBtn) {
    quickBadgeBtn.addEventListener('click', () => {
      window.BadgeManager.openModal({ mode: 'individual', context: 'quick-badge' });
    });
  }

  const thermoBtn = document.getElementById('toolbar-thermo-btn');
  if (thermoBtn) {
    thermoBtn.addEventListener('click', () => {
      window.App.navigateTo('badge-collection');
      setTimeout(() => {
        document.getElementById('badge-tab-class')?.click();
      }, 100);
    });
  }

  // === 드로어 ===
  if (hamburger) {
    hamburger.addEventListener('click', e => {
      e.stopPropagation();
      openDrawer();
    });
  }

  if (overlay) {
    overlay.addEventListener('click', closeDrawer);
  }

  // 드로어 네비 클릭
  if (drawer) {
    drawer.querySelectorAll('.mobile-nav-item').forEach(item => {
      item.addEventListener('click', () => {
        const route = item.dataset.route;
        if (route) {
          closeDrawer();
          window.App.navigateTo(route);
        }
      });
    });
  }

  // === 반응형 리사이즈 ===
  let resizeTimeout;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      const current = getState();
      if (isMobile()) {
        if (current === 'expanded') setState('minimized');
      }
      // 데스크톱에서 드로어 열려있으면 닫기
      if (!isMobile()) closeDrawer();
    }, 150);
  });
}

export const Toolbar = { init, show, hide, syncActiveTab, closeDrawer };
