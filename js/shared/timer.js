/* ============================================
   PE Picker - Timer Module
   Timer 클래스 + 전체화면 타이머
   ============================================ */

import { UI } from './ui-utils.js';
import { Sound } from './sound.js';

// === Timer Class ===
class Timer {
  constructor(options = {}) {
    this.totalSeconds = options.seconds || 180;
    this.remainingSeconds = this.totalSeconds;
    this.interval = null;
    this.isRunning = false;

    this.onTick = options.onTick || null;
    this.onWarning = options.onWarning || null;
    this.onComplete = options.onComplete || null;
    this.warningAt = options.warningAt || 10;
    this.warningFired = false;
  }

  setTime(seconds) {
    this.totalSeconds = seconds;
    this.remainingSeconds = seconds;
    this.warningFired = false;
    if (this.onTick) this.onTick(this.remainingSeconds);
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.interval = setInterval(() => this._tick(), 1000);
  }

  pause() {
    this.isRunning = false;
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  reset(seconds) {
    this.pause();
    if (seconds !== undefined) this.totalSeconds = seconds;
    this.remainingSeconds = this.totalSeconds;
    this.warningFired = false;
    if (this.onTick) this.onTick(this.remainingSeconds);
  }

  toggle() {
    if (this.isRunning) this.pause();
    else this.start();
  }

  destroy() {
    this.pause();
    this.onTick = null;
    this.onWarning = null;
    this.onComplete = null;
  }

  _tick() {
    if (!this.isRunning) return;
    this.remainingSeconds--;

    if (this.onTick) this.onTick(this.remainingSeconds);

    if (this.remainingSeconds <= this.warningAt && !this.warningFired) {
      this.warningFired = true;
      if (this.onWarning) this.onWarning();
    }

    if (this.remainingSeconds <= 0) {
      this.pause();
      if (this.onComplete) this.onComplete();
    }
  }
}

// === Fullscreen Timer ===
let fsTimer = null;
let fsOnClose = null;
let fsInitialized = false;

/** #fullscreen-timer DOM이 없으면 동적 생성 */
function ensureFullscreenDOM() {
  if (document.getElementById('fullscreen-timer')) return;

  const whistleSvg =
    '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>';

  const html = `
<div id="fullscreen-timer" class="fullscreen-timer">
  <div id="fs-timer-display" class="timer-display timer-normal">00:00</div>
  <div class="timer-controls">
    <button id="fs-timer-toggle" class="timer-btn"><svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg></button>
    <button id="fs-timer-close" class="timer-btn"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
  </div>
  <div class="fs-whistle-section">
    <div class="fs-whistle-modes">
      <button class="fs-whistle-mode fs-whistle-mode--active" data-fs-whistle-mode data-mode="hold">꾹</button>
      <button class="fs-whistle-mode" data-fs-whistle-mode data-mode="long">삐—</button>
      <button class="fs-whistle-mode" data-fs-whistle-mode data-mode="triple">삐삐삐</button>
    </div>
    <div class="timer-whistle-btn-wrap" style="position:relative; display:flex; align-items:center; justify-content:center">
      <button id="fs-timer-whistle-btn" class="timer-whistle-btn">${whistleSvg}</button>
      <div class="timer-whistle-ring" id="fs-timer-whistle-ring1"></div>
      <div class="timer-whistle-ring" id="fs-timer-whistle-ring2"></div>
    </div>
  </div>
</div>`;
  document.body.insertAdjacentHTML('beforeend', html);
}

function initFullscreen() {
  if (fsInitialized) return;
  const toggleBtn = document.getElementById('fs-timer-toggle');
  const closeBtn = document.getElementById('fs-timer-close');

  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      if (fsTimer) {
        fsTimer.toggle();
        toggleBtn.innerHTML = fsTimer.isRunning
          ? '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>'
          : '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>';
      }
    });
  }

  if (closeBtn) {
    closeBtn.addEventListener('click', closeFullscreen);
  }
  fsInitialized = true;
}

function openFullscreen(seconds, onClose) {
  ensureFullscreenDOM();
  initFullscreen();

  const el = document.getElementById('fullscreen-timer');
  const display = document.getElementById('fs-timer-display');
  const toggleBtn = document.getElementById('fs-timer-toggle');
  if (!el || !display) return;

  fsOnClose = onClose || null;

  // 기존 타이머 정리
  if (fsTimer) fsTimer.destroy();

  fsTimer = new Timer({
    seconds,
    onTick: remaining => {
      display.textContent = UI.formatTime(remaining);
      // 색상 변경
      display.classList.remove('timer-normal', 'timer-warning', 'timer-danger');
      if (remaining > 30) display.classList.add('timer-normal');
      else if (remaining > 10) display.classList.add('timer-warning');
      else display.classList.add('timer-danger');
      // 10초 카운트다운 비프음
      if (remaining <= 10 && remaining > 0) Sound.playBeep();
    },
    onWarning: () => {
      Sound.playWarning();
    },
    onComplete: () => {
      Sound.playEnd();
      display.textContent = '00:00';
      display.classList.remove('timer-normal', 'timer-warning');
      display.classList.add('timer-danger');
      toggleBtn.innerHTML =
        '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>';
      // 2초 후 자동 닫기
      setTimeout(closeFullscreen, 2000);
    },
    warningAt: 10,
  });

  display.textContent = UI.formatTime(seconds);
  display.classList.remove('timer-warning', 'timer-danger');
  display.classList.add('timer-normal');
  toggleBtn.innerHTML =
    '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>';

  el.classList.add('show');
  document.body.style.overflow = 'hidden';

  // 바로 시작
  fsTimer.start();
}

function closeFullscreen() {
  const el = document.getElementById('fullscreen-timer');
  if (el) el.classList.remove('show');
  document.body.style.overflow = '';
  if (fsTimer) {
    fsTimer.destroy();
    fsTimer = null;
  }
  if (fsOnClose) {
    fsOnClose();
    fsOnClose = null;
  }
}

export const TimerModule = { Timer, openFullscreen, closeFullscreen, ensureFullscreenDOM };
