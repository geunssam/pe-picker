/* ============================================
   PE Picker - Quick Timer (퀵 타이머 패널)
   whistle.js → timer.js 단방향 의존
   ============================================ */

import { TimerModule } from './timer.js';
import { Whistle } from './whistle.js';

let panel = null;
let panelOpen = false;

// === 패널 열기/닫기 ===
function openPanel() {
  panelOpen = true;
  if (panel) panel.classList.add('timer-panel--open');
}

function closePanel() {
  panelOpen = false;
  if (panel) panel.classList.remove('timer-panel--open');
}

function togglePanel() {
  if (panelOpen) closePanel();
  else openPanel();
}

// === 퀵 타이머 시작 ===
function startQuickTimer(seconds) {
  if (!seconds || seconds <= 0) return;
  closePanel();

  // AudioContext 미리 활성화 (사용자 제스처에서 호출 — 모바일 필수)
  Whistle.unlockAudio();

  // 전체화면 DOM 보장
  TimerModule.ensureFullscreenDOM();

  // 전체화면 타이머 내 휘슬 바인딩 (1회)
  bindFsWhistleOnce();

  // 전체화면 타이머 시작
  TimerModule.openFullscreen(seconds);
}

// === 전체화면 타이머 휘슬 바인딩 (1회만) ===
let fsBound = false;

function bindFsWhistleOnce() {
  if (fsBound) return;
  const btn = document.getElementById('fs-timer-whistle-btn');
  if (!btn) return;

  Whistle.bindTimerWhistle(
    'fs-timer-whistle-btn',
    'fs-timer-whistle-ring1',
    'fs-timer-whistle-ring2'
  );

  // 휘슬 모드 버튼 바인딩
  document.querySelectorAll('[data-fs-whistle-mode]').forEach(b => {
    b.addEventListener('click', () => {
      const mode = b.dataset.mode;
      document.querySelectorAll('[data-fs-whistle-mode]').forEach(m => {
        m.classList.toggle('fs-whistle-mode--active', m.dataset.mode === mode);
      });
      Whistle.setTimerMode(mode);
    });
  });

  fsBound = true;
}

// === 스텝퍼 바인딩 (패널 내 분/초) ===
function initSteppers() {
  if (!panel) return;

  panel.querySelectorAll('.stepper-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.dataset.target;
      const input = document.getElementById(targetId);
      if (!input) return;

      const min = parseInt(input.min) || 0;
      const max = parseInt(input.max) || 59;
      let val = parseInt(input.value) || 0;

      if (btn.classList.contains('stepper-plus')) {
        val = Math.min(val + 1, max);
      } else {
        val = Math.max(val - 1, min);
      }
      input.value = val;
    });
  });
}

// === 초기화 ===
function init() {
  panel = document.getElementById('timer-panel');
  if (!panel) return;

  // 패널 바깥 클릭으로 닫기 (right-toolbar도 제외)
  document.addEventListener('click', e => {
    const toolbar = document.getElementById('right-toolbar');
    if (panelOpen && !panel.contains(e.target) && (!toolbar || !toolbar.contains(e.target))) {
      closePanel();
    }
  });

  // 닫기 버튼
  const closeBtn = document.getElementById('timer-panel-close');
  if (closeBtn) closeBtn.addEventListener('click', closePanel);

  // 프리셋 버튼
  panel.querySelectorAll('.timer-preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const seconds = parseInt(btn.dataset.seconds);
      if (seconds > 0) startQuickTimer(seconds);
    });
  });

  // 스텝퍼
  initSteppers();

  // 커스텀 시작 버튼
  const startBtn = document.getElementById('timer-quick-start');
  if (startBtn) {
    startBtn.addEventListener('click', () => {
      const min = parseInt(document.getElementById('timer-quick-min')?.value) || 0;
      const sec = parseInt(document.getElementById('timer-quick-sec')?.value) || 0;
      const total = min * 60 + sec;
      if (total <= 0) return;
      startQuickTimer(total);
    });
  }
}

export const QuickTimer = { init, show: () => {}, hide: closePanel, togglePanel, closePanel };
