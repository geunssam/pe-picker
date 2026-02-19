/* ============================================
   PE Picker - Badge Collection UI
   뱃지도감 탭 렌더링 (개인/학급 통계/온도계)
   ============================================ */

import { Store } from '../shared/store.js';
import { UI } from '../shared/ui-utils.js';
import { BADGE_TYPES, BADGE_KEYS, getLevelInfo, DEFAULT_THERMOSTAT } from './badge-config.js';

let currentTab = 'personal'; // 'personal' | 'class'
let editMilestones = []; // 편집 중인 마일스톤

function init() {
  // 내부 탭 전환
  document
    .getElementById('badge-tab-personal')
    ?.addEventListener('click', () => switchTab('personal'));
  document.getElementById('badge-tab-class')?.addEventListener('click', () => switchTab('class'));

  // 학생 드롭다운
  document.getElementById('badge-student-dropdown')?.addEventListener('change', onStudentSelect);

  // 자유 뱃지 부여
  document.getElementById('badge-free-award-btn')?.addEventListener('click', () => {
    window.BadgeManager.openModal({ mode: 'individual', context: 'badge-collection' });
  });

  // 온도계 설정
  document.getElementById('thermo-settings-btn')?.addEventListener('click', toggleThermoSettings);
  document.getElementById('thermo-save-btn')?.addEventListener('click', saveThermoSettings);

  // 뱃지 상세 모달 닫기
  document.getElementById('badge-detail-close')?.addEventListener('click', closeBadgeDetail);
  document.getElementById('badge-detail-modal')?.addEventListener('click', e => {
    if (e.target.id === 'badge-detail-modal') closeBadgeDetail();
  });

  // 뱃지 가이드 모달
  document.getElementById('badge-guide-open-btn')?.addEventListener('click', openBadgeGuide);
  document.getElementById('badge-guide-close')?.addEventListener('click', closeBadgeGuide);
  document.getElementById('badge-guide-modal')?.addEventListener('click', e => {
    if (e.target.id === 'badge-guide-modal') closeBadgeGuide();
  });

  // 뱃지 업데이트 이벤트 수신
  window.addEventListener('badge-updated', () => {
    if (document.getElementById('page-badge-collection')?.classList.contains('active')) {
      onPageEnter();
    }
  });
}

function onPageEnter() {
  populateStudentDropdown();
  if (currentTab === 'personal') {
    const dropdown = document.getElementById('badge-student-dropdown');
    if (dropdown?.value) {
      renderPersonalView(dropdown.value);
    }
  } else {
    renderClassView();
  }
}

function switchTab(tab) {
  currentTab = tab;

  document.getElementById('badge-tab-personal')?.classList.toggle('active', tab === 'personal');
  document.getElementById('badge-tab-class')?.classList.toggle('active', tab === 'class');

  const personalView = document.getElementById('badge-personal-view');
  const classView = document.getElementById('badge-class-view');

  if (personalView) personalView.style.display = tab === 'personal' ? '' : 'none';
  if (classView) classView.style.display = tab === 'class' ? '' : 'none';

  if (tab === 'class') {
    renderClassView();
  }
}

// === 개인 뱃지 탭 ===
function populateStudentDropdown() {
  const select = document.getElementById('badge-student-dropdown');
  if (!select) return;

  const cls = Store.getSelectedClass();
  if (!cls) {
    select.innerHTML = '<option value="">학급을 먼저 선택하세요</option>';
    return;
  }

  const currentVal = select.value;
  select.innerHTML = '<option value="">학생 선택...</option>';

  (cls.students || []).forEach(s => {
    const opt = document.createElement('option');
    opt.value = s.id;
    opt.textContent = s.name;
    select.appendChild(opt);
  });

  if (currentVal && select.querySelector(`option[value="${currentVal}"]`)) {
    select.value = currentVal;
    renderPersonalView(currentVal);
  }
}

function onStudentSelect(e) {
  const studentId = e.target.value;
  if (studentId) {
    renderPersonalView(studentId);
  } else {
    document.getElementById('badge-level-section').style.display = 'none';
    document.getElementById('badge-inventory').innerHTML = '';
  }
}

function renderPersonalView(studentId) {
  const cls = Store.getSelectedClass();
  if (!cls) return;

  const xp = Store.getStudentXp(cls.id, studentId);
  const levelInfo = getLevelInfo(xp);
  const badgeCounts = Store.getStudentBadgeCounts(cls.id, studentId);

  // 레벨 바
  const levelSection = document.getElementById('badge-level-section');
  const levelText = document.getElementById('badge-level-text');
  const xpFill = document.getElementById('badge-xp-fill');
  const xpText = document.getElementById('badge-xp-text');

  if (levelSection) levelSection.style.display = '';
  if (levelText) levelText.textContent = `Lv.${levelInfo.level} ${levelInfo.name}`;
  if (xpFill) xpFill.style.width = `${levelInfo.progress * 100}%`;
  if (xpText) {
    xpText.textContent = levelInfo.nextXp ? `${xp} / ${levelInfo.nextXp} XP` : `${xp} XP (MAX)`;
  }

  // 뱃지 인벤토리 (큰 이미지 + 이름 + 개수)
  const inventory = document.getElementById('badge-inventory');
  if (inventory) {
    inventory.innerHTML = BADGE_KEYS.map(key => {
      const badge = BADGE_TYPES[key];
      const count = badgeCounts[key] || 0;
      const emptyClass = count === 0 ? ' empty' : '';
      return `<div class="badge-inv-card${emptyClass}" data-badge-key="${key}">
        <img class="badge-inv-img" src="${badge.image}" alt="${badge.name}" />
        <div class="badge-inv-label">${badge.name}</div>
        <div class="badge-inv-count">×${count}</div>
      </div>`;
    }).join('');

    // 뱃지 클릭 → 상세 모달
    inventory.querySelectorAll('.badge-inv-card').forEach(card => {
      card.addEventListener('click', () => {
        openBadgeDetail(card.dataset.badgeKey, badgeCounts);
      });
    });
  }
}

// === 뱃지 상세 모달 ===
function openBadgeDetail(key, counts) {
  const badge = BADGE_TYPES[key];
  if (!badge) return;

  const modal = document.getElementById('badge-detail-modal');
  const img = document.getElementById('badge-detail-img');
  const name = document.getElementById('badge-detail-name');
  const desc = document.getElementById('badge-detail-desc');
  const count = document.getElementById('badge-detail-count');

  if (img) img.src = badge.image;
  if (name) name.textContent = badge.name;
  if (desc) desc.textContent = badge.desc;
  if (count) {
    const c = counts?.[key] || 0;
    count.textContent = c > 0 ? `보유: ${c}개` : '아직 미보유';
    count.className = 'badge-detail-count' + (c > 0 ? ' owned' : '');
  }

  if (modal) {
    modal.style.display = 'flex';
    requestAnimationFrame(() => modal.classList.add('open'));
  }
}

function closeBadgeDetail() {
  const modal = document.getElementById('badge-detail-modal');
  if (modal) {
    modal.classList.remove('open');
    setTimeout(() => {
      modal.style.display = 'none';
    }, 200);
  }
}

// === 뱃지 가이드 모달 (전체 10종 설명) ===
function openBadgeGuide() {
  const grid = document.getElementById('badge-guide-grid');
  if (grid) {
    grid.innerHTML = BADGE_KEYS.map(key => {
      const badge = BADGE_TYPES[key];
      return `<div class="badge-guide-item">
        <img src="${badge.image}" alt="${badge.name}" />
        <div class="badge-guide-item-text">
          <div class="badge-guide-item-name">${badge.emoji} ${badge.name}</div>
          <div class="badge-guide-item-desc">${badge.desc}</div>
        </div>
      </div>`;
    }).join('');
  }

  const modal = document.getElementById('badge-guide-modal');
  if (modal) {
    modal.style.display = 'flex';
    requestAnimationFrame(() => modal.classList.add('open'));
  }
}

function closeBadgeGuide() {
  const modal = document.getElementById('badge-guide-modal');
  if (modal) {
    modal.classList.remove('open');
    setTimeout(() => {
      modal.style.display = 'none';
    }, 200);
  }
}

// === 학급 통계 탭 ===
function renderClassView() {
  const cls = Store.getSelectedClass();
  if (!cls) return;

  renderThermometer(cls.id);
  renderClassBadgeStats(cls.id);
  renderStudentRanking(cls.id);
}

function renderThermometer(classId) {
  const settings = Store.getThermostatSettings(classId);
  const totalBadges = Store.getClassTotalBadges(classId);
  const temp = Math.min(100, Math.round((totalBadges / settings.targetBadges) * 100));

  // 온도 표시
  const tempDisplay = document.getElementById('thermo-temp-display');
  if (tempDisplay) tempDisplay.textContent = `${temp}°C`;

  // 세로 바 채우기 (높이로)
  const barFill = document.getElementById('thermo-bar-fill');
  if (barFill) barFill.style.height = `${temp}%`;

  // 눈금 생성 (0~100, 10단위)
  const scaleEl = document.getElementById('thermo-scale');
  if (scaleEl) {
    scaleEl.innerHTML = '';
    for (let i = 100; i >= 0; i -= 10) {
      const mark = document.createElement('div');
      mark.className = 'thermo-scale-mark';
      mark.innerHTML = `<span class="thermo-scale-label">${i}°C</span><span class="thermo-scale-tick"></span>`;
      scaleEl.appendChild(mark);
    }
  }

  // 마일스톤 (겹치지 않는 리스트형)
  const milestonesEl = document.getElementById('thermo-milestones');
  if (milestonesEl) {
    const sorted = [...(settings.milestones || [])].sort((a, b) => b.temp - a.temp);
    milestonesEl.innerHTML = sorted
      .map(ms => {
        const achieved = temp >= ms.temp;
        let cls = 'thermo-ms-tag';
        if (achieved) cls += ' achieved';
        return `<div class="${cls}">
        <span class="thermo-ms-reward">${UI.escapeHtml(ms.reward)}</span>
        <span class="thermo-ms-temp">${ms.temp}°C ${achieved ? '✅' : ''}</span>
      </div>`;
      })
      .join('');
  }

  // 설정 패널 값 채우기
  const targetInput = document.getElementById('thermo-target-input');
  if (targetInput) targetInput.value = settings.targetBadges;

  // 마일스톤 편집 데이터 세팅
  editMilestones = [...(settings.milestones || DEFAULT_THERMOSTAT.milestones)].sort(
    (a, b) => a.temp - b.temp
  );
  renderMilestoneEditor();
}

// === 마일스톤 편집 UI ===
function renderMilestoneEditor() {
  const container = document.getElementById('thermo-milestone-editor');
  if (!container) return;

  container.innerHTML = `
    <div class="thermo-ms-editor">
      <div class="thermo-ms-editor-title">보상 마일스톤 편집</div>
      ${editMilestones
        .map(
          (ms, i) => `
        <div class="thermo-ms-edit-row" data-idx="${i}">
          <input type="number" class="ms-temp-input" value="${ms.temp}" min="1" max="100" />
          <span class="thermo-ms-unit">°C</span>
          <input type="text" class="ms-reward-input" value="${UI.escapeHtml(ms.reward)}" placeholder="보상 내용" />
          <button class="thermo-ms-remove-btn" data-idx="${i}">×</button>
        </div>
      `
        )
        .join('')}
      <button class="thermo-ms-add-btn">+ 마일스톤 추가</button>
    </div>
  `;

  // 이벤트 바인딩
  container.querySelectorAll('.ms-temp-input').forEach((input, i) => {
    input.addEventListener('change', () => {
      editMilestones[i].temp = parseInt(input.value) || 0;
    });
  });

  container.querySelectorAll('.ms-reward-input').forEach((input, i) => {
    input.addEventListener('change', () => {
      editMilestones[i].reward = input.value.trim();
    });
  });

  container.querySelectorAll('.thermo-ms-remove-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.idx);
      editMilestones.splice(idx, 1);
      renderMilestoneEditor();
    });
  });

  container.querySelector('.thermo-ms-add-btn')?.addEventListener('click', () => {
    const maxTemp = editMilestones.length > 0 ? Math.max(...editMilestones.map(m => m.temp)) : 0;
    editMilestones.push({ temp: Math.min(maxTemp + 10, 100), reward: '' });
    renderMilestoneEditor();
  });
}

function renderClassBadgeStats(classId) {
  const counts = Store.getClassBadgeCounts(classId);
  const container = document.getElementById('badge-class-stats');
  if (!container) return;

  container.innerHTML = BADGE_KEYS.map(key => {
    const badge = BADGE_TYPES[key];
    const count = counts[key] || 0;
    const emptyClass = count === 0 ? ' empty' : '';
    return `<div class="badge-inv-item${emptyClass}">
      <img class="badge-inv-img" src="${badge.image}" alt="${badge.name}" />
      <span class="badge-inv-count">${count}</span>
      <span class="badge-inv-name">${badge.name}</span>
    </div>`;
  }).join('');
}

function renderStudentRanking(classId) {
  const ranking = Store.getStudentRanking(classId, 5);
  const list = document.getElementById('badge-ranking-list');
  if (!list) return;

  if (ranking.length === 0) {
    list.innerHTML =
      '<div style="padding: var(--space-md); text-align: center; font-size: var(--font-size-sm); color: var(--text-tertiary);">아직 뱃지 데이터가 없습니다</div>';
    return;
  }

  const medals = ['🥇', '🥈', '🥉', '4', '5'];
  list.innerHTML = ranking
    .map((r, i) => {
      return `<div class="badge-ranking-item">
      <span class="badge-rank-num">${medals[i] || i + 1}</span>
      <span class="badge-rank-name">${UI.escapeHtml(r.studentName)}</span>
      <span class="badge-rank-count">${r.count}개</span>
    </div>`;
    })
    .join('');
}

// === 온도계 설정 ===
function toggleThermoSettings() {
  const panel = document.getElementById('thermo-settings-panel');
  if (panel) panel.classList.toggle('open');
}

function saveThermoSettings() {
  const cls = Store.getSelectedClass();
  if (!cls) return;

  const targetBadges = parseInt(document.getElementById('thermo-target-input')?.value) || 200;

  // 유효한 마일스톤만 저장
  const validMilestones = editMilestones
    .filter(ms => ms.temp > 0 && ms.temp <= 100 && ms.reward.trim())
    .sort((a, b) => a.temp - b.temp);

  Store.saveThermostatSettings(cls.id, {
    targetBadges,
    milestones: validMilestones,
  });

  toggleThermoSettings();
  renderThermometer(cls.id);
  UI.showToast('온도계 설정이 저장되었습니다', 'success');
}

export const BadgeCollectionUI = {
  init,
  onPageEnter,
};
