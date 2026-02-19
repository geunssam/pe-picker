/* ============================================
   PE Picker - Tools FAB (Speed Dial)
   휘슬 + 타이머 통합 FAB
   ============================================ */

import { Whistle } from './whistle.js';
import { QuickTimer } from './quick-timer.js';

let container = null;
let mainBtn = null;
let whistleMini = null;
let timerMini = null;
let isOpen = false;

function init() {
  container = document.getElementById('tools-fab-container');
  mainBtn = document.getElementById('tools-fab-main');
  whistleMini = document.getElementById('tools-fab-whistle');
  timerMini = document.getElementById('tools-fab-timer');

  if (!container || !mainBtn) return;

  mainBtn.addEventListener('click', e => {
    e.stopPropagation();
    toggleSpeedDial();
  });

  if (whistleMini) {
    whistleMini.addEventListener('click', e => {
      e.stopPropagation();
      closeSpeedDial();
      QuickTimer.closePanel();
      Whistle.togglePanel();
    });
  }

  if (timerMini) {
    timerMini.addEventListener('click', e => {
      e.stopPropagation();
      closeSpeedDial();
      Whistle.closePanel();
      QuickTimer.togglePanel();
    });
  }

  // 바깥 클릭으로 닫기
  document.addEventListener('click', e => {
    if (isOpen && !container.contains(e.target)) {
      closeSpeedDial();
    }
  });
}

function toggleSpeedDial() {
  if (isOpen) {
    closeSpeedDial();
  } else {
    // 열리기 전에 패널들 닫기
    Whistle.closePanel();
    QuickTimer.closePanel();
    openSpeedDial();
  }
}

function openSpeedDial() {
  isOpen = true;
  if (container) container.classList.add('open');
  if (mainBtn) mainBtn.classList.add('tools-fab-main--open');
}

function closeSpeedDial() {
  isOpen = false;
  if (container) container.classList.remove('open');
  if (mainBtn) mainBtn.classList.remove('tools-fab-main--open');
}

function show() {
  if (container) container.style.display = '';
}

function hide() {
  if (container) container.style.display = 'none';
  closeSpeedDial();
  Whistle.closePanel();
  QuickTimer.closePanel();
}

export const ToolsFab = { init, show, hide };
