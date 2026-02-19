/* ============================================
   PE Picker - UI Utilities
   토스트, 모달, 셔플 알고리즘, 유틸리티
   ============================================ */

import { Sound } from './sound.js';

// === Toast ===
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type === 'success' ? 'toast-success' : type === 'error' ? 'toast-error' : ''}`;
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => {
    if (toast.parentNode) toast.remove();
  }, 3000);
}

// === Modal Helpers ===
function showModal(id) {
  const el = document.getElementById(id);
  if (el) {
    el.classList.add('show');
    document.body.style.overflow = 'hidden';
  }
}

function hideModal(id) {
  const el = document.getElementById(id);
  if (el) {
    el.classList.remove('show');
    document.body.style.overflow = '';
  }
}

// === Picking Overlay ===
function showPickingOverlay(icon = '', text = '뽑는 중...') {
  const overlay = document.getElementById('picking-overlay');
  const iconEl = document.getElementById('picking-emoji');
  const textEl = document.getElementById('picking-text');
  if (overlay) {
    iconEl.innerHTML = icon;
    textEl.textContent = text;
    overlay.classList.add('show');
  }
}

function hidePickingOverlay() {
  const overlay = document.getElementById('picking-overlay');
  if (overlay) overlay.classList.remove('show');
}

// === Fisher-Yates Shuffle ===
function shuffleArray(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// === Format Time ===
function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// === Sleep ===
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// === HTML Escape (XSS 방지) ===
function escapeHtml(text) {
  if (typeof text !== 'string') return text;
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// === Number Stepper 바인딩 ===
function initSteppers() {
  document.querySelectorAll('.stepper-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.dataset.target;
      const dir = btn.dataset.dir;
      const step = parseInt(btn.dataset.step || '1');
      const input = document.getElementById(targetId);
      if (!input) return;

      const min = parseInt(input.min || '0');
      const max = parseInt(input.max || '999');
      let val = parseInt(input.value) || 0;

      if (dir === 'up') val = Math.min(val + step, max);
      else val = Math.max(val - step, min);

      input.value = val;
      input.dispatchEvent(new Event('change'));
      Sound.playClick();
    });
  });
}

// === Toggle Switch CSS (inline) ===
function initToggleStyles() {
  if (document.getElementById('toggle-styles')) return;
  const style = document.createElement('style');
  style.id = 'toggle-styles';
  style.textContent = `
    .toggle {
      position: relative;
      display: inline-block;
      width: 36px;
      height: 20px;
    }
    .toggle input {
      opacity: 0;
      width: 0;
      height: 0;
    }
    .toggle-slider {
      position: absolute;
      cursor: pointer;
      inset: 0;
      background: #ccc;
      border-radius: 20px;
      transition: 0.3s;
    }
    .toggle-slider::before {
      content: '';
      position: absolute;
      width: 16px;
      height: 16px;
      left: 2px;
      bottom: 2px;
      background: white;
      border-radius: 50%;
      transition: 0.3s;
      box-shadow: 0 1px 3px rgba(0,0,0,0.2);
    }
    .toggle input:checked + .toggle-slider {
      background: var(--gradient-primary);
      background: var(--color-primary);
    }
    .toggle input:checked + .toggle-slider::before {
      transform: translateX(16px);
    }
  `;
  document.head.appendChild(style);
}

// 초기화
function init() {
  initToggleStyles();
  initSteppers();

  // 모달 배경 클릭으로 닫기
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => {
      if (e.target === overlay) {
        overlay.classList.remove('show');
        document.body.style.overflow = '';
      }
    });
  });
}

// === Confirm Dialog ===
function showConfirm(message, { confirmText = '확인', cancelText = '취소', danger = false } = {}) {
  return new Promise(resolve => {
    // 기존 confirm 모달 제거
    document.getElementById('ui-confirm-modal')?.remove();

    const modal = document.createElement('div');
    modal.id = 'ui-confirm-modal';
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-alert">
        <div class="modal-alert-body">
          <div class="modal-alert-message">${escapeHtml(message).replace(/\n/g, '<br>')}</div>
          <div class="confirm-btn-row">
            <button class="btn-confirm-cancel">${escapeHtml(cancelText)}</button>
            <button class="btn-confirm-ok${danger ? ' btn-confirm-danger' : ''}">${escapeHtml(confirmText)}</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    requestAnimationFrame(() => modal.classList.add('show'));

    modal.querySelector('.btn-confirm-cancel').addEventListener('click', () => {
      modal.classList.remove('show');
      setTimeout(() => modal.remove(), 200);
      resolve(false);
    });

    modal.querySelector('.btn-confirm-ok').addEventListener('click', () => {
      modal.classList.remove('show');
      setTimeout(() => modal.remove(), 200);
      resolve(true);
    });

    modal.addEventListener('click', e => {
      if (e.target === modal) {
        modal.classList.remove('show');
        setTimeout(() => modal.remove(), 200);
        resolve(false);
      }
    });
  });
}

document.addEventListener('DOMContentLoaded', init);

export const UI = {
  showToast,
  showModal,
  hideModal,
  showPickingOverlay,
  hidePickingOverlay,
  shuffleArray,
  formatTime,
  sleep,
  initSteppers,
  escapeHtml,
  showConfirm,
};
