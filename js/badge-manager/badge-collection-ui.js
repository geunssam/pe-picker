/* ============================================
   PE Picker - Badge Collection UI
   배지도감 탭 렌더링 (개인/학급 통계/온도계)
   ============================================ */

import { Store } from '../shared/store.js';
import { UI } from '../shared/ui-utils.js';
import { Icons } from '../shared/icons.js';
import { BADGE_TYPES, BADGE_KEYS, getLevelInfo, DEFAULT_THERMOSTAT } from './badge-config.js';
import { FirestoreSync } from '../firestore-sync.js';

let currentTab = 'personal'; // 'personal' | 'class'
let editMilestones = []; // 편집 중인 마일스톤
let currentModalStudentId = null; // 학생 모달에 열린 학생 ID

function init() {
  // 내부 탭 전환
  document
    .getElementById('badge-tab-personal')
    ?.addEventListener('click', () => switchTab('personal'));
  document.getElementById('badge-tab-class')?.addEventListener('click', () => switchTab('class'));

  // 자유 배지 부여
  document.getElementById('badge-free-award-btn')?.addEventListener('click', () => {
    window.BadgeManager.openModal({ mode: 'individual', context: 'badge-collection' });
  });

  // 온도계 설정
  document.getElementById('thermo-settings-btn')?.addEventListener('click', toggleThermoSettings);
  document.getElementById('thermo-save-btn')?.addEventListener('click', saveThermoSettings);

  // 배지 상세 모달 닫기
  document.getElementById('badge-detail-close')?.addEventListener('click', closeBadgeDetail);
  document.getElementById('badge-detail-modal')?.addEventListener('click', e => {
    if (e.target.id === 'badge-detail-modal') closeBadgeDetail();
  });

  // 학생 배지 모달 닫기
  document
    .getElementById('badge-student-modal-close')
    ?.addEventListener('click', closeStudentModal);
  document.getElementById('badge-student-modal')?.addEventListener('click', e => {
    if (e.target.id === 'badge-student-modal') closeStudentModal();
  });

  // 배지 가이드 모달
  document.getElementById('badge-guide-open-btn')?.addEventListener('click', openBadgeGuide);
  document.getElementById('badge-guide-close')?.addEventListener('click', closeBadgeGuide);
  document.getElementById('badge-guide-modal')?.addEventListener('click', e => {
    if (e.target.id === 'badge-guide-modal') closeBadgeGuide();
  });

  // 배지 업데이트 이벤트 수신
  window.addEventListener('badge-updated', () => {
    if (document.getElementById('page-badge-collection')?.classList.contains('active')) {
      onPageEnter();
    }
  });
}

function onPageEnter() {
  if (currentTab === 'personal') {
    renderStudentCards();
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

  if (tab === 'personal') {
    renderStudentCards();
  } else {
    renderClassView();
  }
}

// === 개인 배지 탭 — 학생 카드 그리드 ===
function renderStudentCards() {
  const grid = document.getElementById('badge-student-card-grid');
  if (!grid) return;

  const cls = Store.getSelectedClass();
  if (!cls || !cls.students?.length) {
    grid.innerHTML = '<div class="badge-empty-msg">학급에 등록된 학생이 없습니다</div>';
    return;
  }

  grid.innerHTML = cls.students
    .map(s => {
      const xp = Store.getStudentXp(cls.id, s.id);
      const levelInfo = getLevelInfo(xp);
      const totalBadges = Store.getStudentBadgeCounts(cls.id, s.id);
      const badgeTotal = Object.values(totalBadges).reduce((a, b) => a + b, 0);

      return `<button class="badge-stu-card" data-student-id="${s.id}">
        <span class="badge-stu-name">${UI.escapeHtml(s.name)}</span>
        <span class="badge-stu-level">Lv.${levelInfo.level}</span>
        <span class="badge-stu-count">${badgeTotal}개</span>
      </button>`;
    })
    .join('');

  // 카드 클릭 → 학생 배지 모달
  grid.querySelectorAll('.badge-stu-card').forEach(card => {
    card.addEventListener('click', () => {
      openStudentModal(card.dataset.studentId);
    });
  });
}

// === 학생 배지 상세 모달 ===
function openStudentModal(studentId) {
  const cls = Store.getSelectedClass();
  if (!cls) return;

  const student = cls.students?.find(s => s.id === studentId);
  if (!student) return;

  currentModalStudentId = studentId;
  renderStudentModalContent(cls, student);

  // 모달 열기
  const modal = document.getElementById('badge-student-modal');
  if (modal) {
    modal.style.display = 'flex';
    requestAnimationFrame(() => modal.classList.add('open'));
  }
}

function renderStudentModalContent(cls, student) {
  const studentId = student.id;
  const xp = Store.getStudentXp(cls.id, studentId);
  const levelInfo = getLevelInfo(xp);
  const badgeCounts = Store.getStudentBadgeCounts(cls.id, studentId);

  // 이름
  const nameEl = document.getElementById('badge-student-modal-name');
  if (nameEl) nameEl.textContent = student.name;

  // 레벨 + XP
  const levelText = document.getElementById('badge-modal-level-text');
  const xpFill = document.getElementById('badge-modal-xp-fill');
  const xpText = document.getElementById('badge-modal-xp-text');

  if (levelText) levelText.textContent = `Lv.${levelInfo.level} ${levelInfo.name}`;
  if (xpFill) xpFill.style.width = `${levelInfo.progress * 100}%`;
  if (xpText) {
    xpText.textContent = levelInfo.nextXp ? `${xp} / ${levelInfo.nextXp} XP` : `${xp} XP (MAX)`;
  }

  // 배지 인벤토리
  const inventory = document.getElementById('badge-student-modal-inventory');
  if (inventory) {
    inventory.innerHTML = BADGE_KEYS.map(key => {
      const badge = BADGE_TYPES[key];
      const count = badgeCounts[key] || 0;
      const emptyClass = count === 0 ? ' empty' : '';
      return `<div class="badge-inv-card${emptyClass}" data-badge-key="${key}">
        <img class="badge-inv-img" src="${badge.image}" alt="${badge.name}" />
        <div class="badge-inv-label">${badge.name}</div>
        <div class="badge-inv-count">&times;${count}</div>
      </div>`;
    }).join('');

    // 배지 클릭 → 배지 상세 + 부여 확인
    inventory.querySelectorAll('.badge-inv-card').forEach(card => {
      card.addEventListener('click', () => {
        showBadgeAwardConfirm(card.dataset.badgeKey, student);
      });
    });
  }
}

// === 배지 클릭 시 상세 안내 + 부여 확인 ===
async function showBadgeAwardConfirm(badgeKey, student) {
  const badge = BADGE_TYPES[badgeKey];
  if (!badge) return;

  const cls = Store.getSelectedClass();
  if (!cls) return;

  const confirmed = await UI.showConfirm(
    `${badge.name} 배지\n\n${badge.desc}\n\n${student.name}에게 부여할까요?`,
    { confirmText: '부여', cancelText: '취소' }
  );

  if (!confirmed) return;

  // 배지 부여
  const result = Store.addBadgeRecords(
    cls.id,
    [{ id: student.id, name: student.name }],
    [badgeKey],
    'badge-collection'
  );

  // Firestore 동기화
  FirestoreSync.syncBadgeLogEntries(result.newEntries);

  UI.showToast(`${student.name}에게 ${badge.name} 배지 부여!`, 'success');

  // 모달 내용 갱신
  renderStudentModalContent(cls, student);

  // 학생 카드 그리드도 갱신
  renderStudentCards();

  // 배지도감 갱신 이벤트
  window.dispatchEvent(new CustomEvent('badge-updated'));
}

function closeStudentModal() {
  const modal = document.getElementById('badge-student-modal');
  if (modal) {
    modal.classList.remove('open');
    setTimeout(() => {
      modal.style.display = 'none';
    }, 200);
  }
}

// === 배지 상세 모달 ===
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

// === 배지 가이드 모달 (전체 10종 설명) ===
function openBadgeGuide() {
  const grid = document.getElementById('badge-guide-grid');
  if (grid) {
    grid.innerHTML = BADGE_KEYS.map(key => {
      const badge = BADGE_TYPES[key];
      return `<div class="badge-guide-item">
        <img src="${badge.image}" alt="${badge.name}" />
        <div class="badge-guide-item-text">
          <div class="badge-guide-item-name">${badge.name}</div>
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

  // 진행 바
  const progressFill = document.getElementById('thermo-progress-fill');
  const progressText = document.getElementById('thermo-progress-text');
  if (progressFill) progressFill.style.width = `${temp}%`;
  if (progressText) {
    progressText.textContent = `${temp}°C ( ${totalBadges} / ${settings.targetBadges} )`;
  }

  // 세로 바 채우기 (높이로)
  const barFill = document.getElementById('thermo-bar-fill');
  if (barFill) barFill.style.height = `${temp}%`;

  // 마일스톤 (온도계 좌우 교대 배치)
  const milestonesEl = document.getElementById('thermo-milestones');
  if (milestonesEl) {
    const sorted = [...(settings.milestones || [])].sort((a, b) => a.temp - b.temp);
    const tubeHeight = 260;
    const bulbOffset = 80;
    milestonesEl.innerHTML = sorted
      .map((ms, i) => {
        const achieved = temp >= ms.temp;
        const side = i % 2 === 0 ? 'ms-left' : 'ms-right';
        const bottomPx = bulbOffset + (ms.temp / 100) * tubeHeight;
        let cls = 'thermo-ms-tag ' + side;
        if (achieved) cls += ' achieved';
        return `<div class="${cls}" style="bottom: ${bottomPx}px">
        <span class="thermo-ms-reward">${UI.escapeHtml(ms.reward)}</span>
        <span class="thermo-ms-temp">${ms.temp}°C ${achieved ? Icons.check(12) : ''}</span>
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
      '<div style="padding: var(--space-md); text-align: center; font-size: var(--font-size-sm); color: var(--text-tertiary);">아직 배지 데이터가 없습니다</div>';
    return;
  }

  const medalClasses = ['rank-medal--gold', 'rank-medal--silver', 'rank-medal--bronze'];
  list.innerHTML = ranking
    .map((r, i) => {
      const rankDisplay =
        i < 3
          ? `<span class="rank-medal ${medalClasses[i]}">${i + 1}</span>`
          : `<span class="badge-rank-num">${i + 1}</span>`;
      return `<div class="badge-ranking-item">
      ${rankDisplay}
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

  const settings = { targetBadges, milestones: validMilestones };
  Store.saveThermostatSettings(cls.id, settings);

  // Firestore 동기화 (fire-and-forget)
  FirestoreSync.syncThermostatToFirestore(cls.id, settings);

  toggleThermoSettings();
  renderThermometer(cls.id);
  UI.showToast('온도계 설정이 저장되었습니다', 'success');
}

export const BadgeCollectionUI = {
  init,
  onPageEnter,
};
