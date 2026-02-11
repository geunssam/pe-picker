/* ============================================
   PE Picker - Timer Module
   Timer 클래스 + 전체화면 타이머
   ============================================ */

const TimerModule = (() => {

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

  function initFullscreen() {
    const toggleBtn = document.getElementById('fs-timer-toggle');
    const closeBtn = document.getElementById('fs-timer-close');

    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        if (fsTimer) {
          fsTimer.toggle();
          toggleBtn.textContent = fsTimer.isRunning ? '⏸' : '▶';
        }
      });
    }

    if (closeBtn) {
      closeBtn.addEventListener('click', closeFullscreen);
    }
  }

  function openFullscreen(seconds, onClose) {
    const el = document.getElementById('fullscreen-timer');
    const display = document.getElementById('fs-timer-display');
    const toggleBtn = document.getElementById('fs-timer-toggle');
    if (!el || !display) return;

    fsOnClose = onClose || null;

    // 기존 타이머 정리
    if (fsTimer) fsTimer.destroy();

    fsTimer = new Timer({
      seconds,
      onTick: (remaining) => {
        display.textContent = UI.formatTime(remaining);
        // 색상 변경
        display.classList.remove('timer-normal', 'timer-warning', 'timer-danger');
        if (remaining > 30) display.classList.add('timer-normal');
        else if (remaining > 10) display.classList.add('timer-warning');
        else display.classList.add('timer-danger');
      },
      onWarning: () => {
        Sound.playWarning();
      },
      onComplete: () => {
        Sound.playEnd();
        display.textContent = '00:00';
        display.classList.remove('timer-normal', 'timer-warning');
        display.classList.add('timer-danger');
        toggleBtn.textContent = '▶';
        // 2초 후 자동 닫기
        setTimeout(closeFullscreen, 2000);
      },
      warningAt: 10,
    });

    display.textContent = UI.formatTime(seconds);
    display.classList.remove('timer-warning', 'timer-danger');
    display.classList.add('timer-normal');
    toggleBtn.textContent = '⏸';

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

  document.addEventListener('DOMContentLoaded', initFullscreen);

  return { Timer, openFullscreen, closeFullscreen };
})();
