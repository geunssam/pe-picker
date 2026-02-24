/* ============================================
   PE Picker - Class Stats UI
   학급 통계 탭 렌더링 (개인 배지/학급 통계/학생별 랭킹)
   ============================================ */

import { Store } from '../../shared/store.js';
import { UI } from '../../shared/ui-utils.js';
import { Icons } from '../../shared/icons.js';
import {
  BADGE_TYPES,
  BADGE_KEYS,
  getLevelInfo,
  DEFAULT_THERMOSTAT,
} from '../badge/badge-config.js';
import { FirestoreSync } from '../../infra/firestore-sync.js';
import './class-stats.css';

let currentTab = 'personal'; // 'personal' | 'class'
let periodMode = '4week'; // '4week' | 'monthly' | 'semester' | 'custom'
let customRange = { from: null, to: null }; // 직접 설정 기간
let editMilestones = []; // 편집 중인 마일스톤
let currentModalStudentId = null; // 학생 모달에 열린 학생 ID

function init() {
  // 내부 탭 전환
  document
    .getElementById('badge-tab-personal')
    ?.addEventListener('click', () => switchTab('personal'));
  document.getElementById('badge-tab-class')?.addEventListener('click', () => switchTab('class'));
  document
    .getElementById('badge-tab-ranking')
    ?.addEventListener('click', () => switchTab('ranking'));

  // 자유 배지 부여
  document.getElementById('badge-free-award-btn')?.addEventListener('click', () => {
    window.BadgeManager.openModal({ mode: 'individual', context: 'badge-collection' });
  });

  // 온도계 모달 설정
  document.getElementById('thermo-settings-btn')?.addEventListener('click', toggleThermoSettings);
  document.getElementById('thermo-save-btn')?.addEventListener('click', saveThermoSettings);

  // 온도계 모달 열림 이벤트
  window.addEventListener('thermo-modal-open', () => {
    const cls = Store.getSelectedClass();
    if (cls) renderThermometer(cls.id);
  });

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

  // 날짜 범위 모달
  document.getElementById('date-range-close')?.addEventListener('click', closeDateRangeModal);
  document.getElementById('date-range-cancel')?.addEventListener('click', closeDateRangeModal);
  document.getElementById('date-range-apply')?.addEventListener('click', applyDateRange);
  document.getElementById('date-range-modal')?.addEventListener('click', e => {
    if (e.target.id === 'date-range-modal') closeDateRangeModal();
  });

  // 배지 업데이트 이벤트 수신
  window.addEventListener('badge-updated', () => {
    if (document.getElementById('page-class-stats')?.classList.contains('active')) {
      onPageEnter();
    }
  });
}

function onPageEnter() {
  if (currentTab === 'personal') {
    renderPersonalView();
  } else if (currentTab === 'class') {
    renderClassView();
  } else if (currentTab === 'ranking') {
    renderRankingView();
  }
}

function switchTab(tab) {
  currentTab = tab;

  document.getElementById('badge-tab-personal')?.classList.toggle('active', tab === 'personal');
  document.getElementById('badge-tab-class')?.classList.toggle('active', tab === 'class');
  document.getElementById('badge-tab-ranking')?.classList.toggle('active', tab === 'ranking');

  const personalView = document.getElementById('badge-personal-view');
  const classView = document.getElementById('badge-class-view');
  const rankingView = document.getElementById('badge-ranking-view');

  if (personalView) personalView.style.display = tab === 'personal' ? '' : 'none';
  if (classView) classView.style.display = tab === 'class' ? '' : 'none';
  if (rankingView) rankingView.style.display = tab === 'ranking' ? '' : 'none';

  if (tab === 'personal') {
    renderPersonalView();
  } else if (tab === 'class') {
    renderClassView();
  } else if (tab === 'ranking') {
    renderRankingView();
  }
}

// === 이름 없는 학생 복구 (배지 로그에서 이름 가져오기) ===
function recoverStudentNames(cls) {
  if (!cls?.students?.length) return false;
  let recovered = false;

  cls.students.forEach(s => {
    if (s.name && s.name.trim()) return; // 이름 있으면 패스
    // 배지 로그에서 이름 복구 시도
    const logs = Store.getBadgeLogsByStudent(cls.id, s.id);
    const logName = logs.find(l => l.studentName)?.studentName;
    if (logName) {
      s.name = logName;
      recovered = true;
    }
  });

  if (recovered) {
    // 복구된 이름을 영구 저장
    Store.updateClass(cls.id, cls.name, cls.students, cls.teamNames, cls.teams, cls.teamCount);
  }
  return recovered;
}

// === 개인 배지 탭 ===
function renderPersonalView() {
  const cls = Store.getSelectedClass();
  if (!cls) return;
  recoverStudentNames(cls);
  renderTimeline(cls.id);
  renderStudentCards();
}

function renderStudentCards() {
  const grid = document.getElementById('badge-student-card-grid');
  if (!grid) return;

  const cls = Store.getSelectedClass();
  if (!cls || !cls.students?.length) {
    grid.innerHTML = '<div class="badge-empty-msg">학급에 등록된 학생이 없습니다</div>';
    return;
  }

  // 이름 있는 학생만 표시 (recoverStudentNames 이후)
  const named = cls.students.filter(s => s.name && s.name.trim());

  grid.innerHTML = named
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

  // 이름 (빈 경우 번호 폴백)
  const nameEl = document.getElementById('badge-student-modal-name');
  if (nameEl) nameEl.textContent = student.name || `${student.number || '?'}번`;

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

  renderClassBadgeStats(cls.id);
  renderPeriodStats(cls.id);
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

  const total = BADGE_KEYS.reduce((sum, k) => sum + (counts[k] || 0), 0);
  const maxCount = Math.max(...BADGE_KEYS.map(k => counts[k] || 0), 1);

  // 최다/최소 배지 찾기
  const sorted = BADGE_KEYS.filter(k => (counts[k] || 0) > 0).sort(
    (a, b) => (counts[b] || 0) - (counts[a] || 0)
  );
  const topKey = sorted[0] || null;
  const bottomKey = sorted.length > 1 ? sorted[sorted.length - 1] : null;

  const donutSvg = total > 0 ? buildDonutChart(counts, total) : '';

  container.innerHTML = `
    <div class="badge-chart-summary">전체 배지 <strong>${total}</strong>개</div>
    ${donutSvg ? `<div class="badge-donut-wrap">${donutSvg}</div>` : ''}
    <div class="badge-chart-grid">
      ${BADGE_KEYS.map(key => {
        const badge = BADGE_TYPES[key];
        const count = counts[key] || 0;
        const pct = total > 0 ? Math.round((count / total) * 100) : 0;
        const barWidth = total > 0 ? Math.round((count / maxCount) * 100) : 0;
        return `<div class="badge-chart-card">
          <img class="badge-chart-img" src="${badge.image}" alt="${badge.name}" />
          <span class="badge-chart-name">${badge.name}</span>
          <span class="badge-chart-count" style="color: ${badge.color}">${count}</span>
          <div class="badge-chart-bar">
            <div class="badge-chart-bar-fill" style="width: ${barWidth}%; background: ${badge.color}"></div>
          </div>
          <span class="badge-chart-pct">${pct}%</span>
        </div>`;
      }).join('')}
    </div>
    ${total > 0 ? renderBadgeHighlight(topKey, bottomKey, counts, total) : ''}`;
}

// === 최다/최소 배지 하이라이트 ===
function renderBadgeHighlight(topKey, bottomKey, counts, total) {
  const topBadge = topKey ? BADGE_TYPES[topKey] : null;
  const bottomBadge = bottomKey ? BADGE_TYPES[bottomKey] : null;
  const topPct = topKey ? Math.round(((counts[topKey] || 0) / total) * 100) : 0;
  const bottomPct = bottomKey ? Math.round(((counts[bottomKey] || 0) / total) * 100) : 0;

  return `<div class="badge-highlight-row">
    ${
      topBadge
        ? `<div class="badge-highlight-card badge-highlight--top">
      <img src="${topBadge.image}" alt="${topBadge.name}" class="badge-highlight-img" />
      <div class="badge-highlight-text">
        <span class="badge-highlight-label">우리 반 최고 덕목</span>
        <span class="badge-highlight-value">${topBadge.name} <strong>${topPct}%</strong></span>
      </div>
    </div>`
        : ''
    }
    ${
      bottomBadge
        ? `<div class="badge-highlight-card badge-highlight--low">
      <img src="${bottomBadge.image}" alt="${bottomBadge.name}" class="badge-highlight-img" />
      <div class="badge-highlight-text">
        <span class="badge-highlight-label">더 키워볼 덕목</span>
        <span class="badge-highlight-value">${bottomBadge.name} <strong>${bottomPct}%</strong></span>
      </div>
    </div>`
        : ''
    }
  </div>`;
}

// === SVG 도넛 차트 ===
function buildDonutChart(counts, total) {
  const size = 180;
  const cx = size / 2;
  const cy = size / 2;
  const outerR = 72;
  const innerR = 44;

  // 0이 아닌 배지만 추출, 큰 순서로 정렬
  const slices = BADGE_KEYS.filter(k => (counts[k] || 0) > 0)
    .map(k => ({ key: k, count: counts[k], badge: BADGE_TYPES[k] }))
    .sort((a, b) => b.count - a.count);

  if (slices.length === 0) return '';

  let angle = -90; // 12시 방향부터 시작
  const paths = slices.map(s => {
    const sweep = (s.count / total) * 360;
    const startRad = (angle * Math.PI) / 180;
    const endRad = ((angle + sweep) * Math.PI) / 180;

    const x1o = cx + outerR * Math.cos(startRad);
    const y1o = cy + outerR * Math.sin(startRad);
    const x2o = cx + outerR * Math.cos(endRad);
    const y2o = cy + outerR * Math.sin(endRad);
    const x1i = cx + innerR * Math.cos(endRad);
    const y1i = cy + innerR * Math.sin(endRad);
    const x2i = cx + innerR * Math.cos(startRad);
    const y2i = cy + innerR * Math.sin(startRad);

    const largeArc = sweep > 180 ? 1 : 0;

    const d = [
      `M ${x1o} ${y1o}`,
      `A ${outerR} ${outerR} 0 ${largeArc} 1 ${x2o} ${y2o}`,
      `L ${x1i} ${y1i}`,
      `A ${innerR} ${innerR} 0 ${largeArc} 0 ${x2i} ${y2i}`,
      'Z',
    ].join(' ');

    angle += sweep;
    return `<path d="${d}" fill="${s.badge.color}" opacity="0.85" />`;
  });

  return `<svg viewBox="0 0 ${size} ${size}" class="badge-donut-chart">
    ${paths.join('')}
    <text x="${cx}" y="${cy - 6}" text-anchor="middle" font-size="22" font-weight="800" fill="var(--text-primary)">${total}</text>
    <text x="${cx}" y="${cy + 12}" text-anchor="middle" font-size="11" font-weight="600" fill="var(--text-tertiary)">전체</text>
  </svg>`;
}

// === 최근 활동 타임라인 ===
function renderTimeline(classId) {
  const container = document.getElementById('badge-timeline');
  if (!container) return;

  const logs = Store.getRecentBadgeLogs(classId, 10);
  if (logs.length === 0) {
    container.innerHTML = '<div class="badge-timeline-empty">아직 배지 기록이 없습니다</div>';
    return;
  }

  container.innerHTML = logs
    .map(log => {
      const badge = BADGE_TYPES[log.badgeType];
      if (!badge) return '';
      const time = formatRelativeTime(log.timestamp);
      return `<div class="badge-timeline-item">
        <img class="badge-timeline-img" src="${badge.image}" alt="${badge.name}" />
        <div class="badge-timeline-info">
          <span class="badge-timeline-name">${UI.escapeHtml(log.studentName)}</span>
          <span class="badge-timeline-badge" style="color: ${badge.color}">${badge.name}</span>
        </div>
        <span class="badge-timeline-time">${time}</span>
      </div>`;
    })
    .join('');
}

function formatRelativeTime(isoStr) {
  const now = new Date();
  const d = new Date(isoStr);
  const diffMs = now - d;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return '방금';
  if (diffMin < 60) return `${diffMin}분 전`;
  if (diffHr < 24) return `${diffHr}시간 전`;
  if (diffDay < 7) return `${diffDay}일 전`;

  const m = d.getMonth() + 1;
  const dd = d.getDate();
  return `${m}/${dd}`;
}

// === 기간별 추이 ===
function renderPeriodStats(classId) {
  const container = document.getElementById('badge-period-stats');
  if (!container) return;

  // 데이터 조회
  const data = getPeriodData(classId);
  const totalCount = Store.getClassTotalBadges(classId);

  // 현재 기간 vs 이전 기간 비교
  const current = data.length > 0 ? data[data.length - 1] : { count: 0 };
  const prev = data.length >= 2 ? data[data.length - 2] : { count: 0 };
  const diff = current.count - prev.count;

  let diffLabel, diffClass;
  if (diff > 0) {
    diffLabel = `+${diff}`;
    diffClass = 'badge-period-diff--up';
  } else if (diff < 0) {
    diffLabel = `${diff}`;
    diffClass = 'badge-period-diff--down';
  } else {
    diffLabel = '±0';
    diffClass = 'badge-period-diff--same';
  }

  const periodLabels = {
    '4week': { cur: '이번 주', prev: '지난 주', diff: '지난 주 대비' },
    monthly: { cur: '이번 달', prev: '지난 달', diff: '지난 달 대비' },
    semester: { cur: '이번 달', prev: '지난 달', diff: '지난 달 대비' },
    custom: { cur: '선택 기간', prev: '', diff: '' },
  };
  const labels = periodLabels[periodMode];

  // 기간 선택 탭
  const tabs = [
    { key: '4week', label: '4주' },
    { key: 'monthly', label: '월간' },
    { key: 'semester', label: '학기' },
    { key: 'custom', label: '직접 설정' },
  ];
  const tabsHtml = tabs
    .map(
      t =>
        `<button class="badge-period-tab${periodMode === t.key ? ' active' : ''}" data-period="${t.key}">${t.label}</button>`
    )
    .join('');

  // 요약 카드 (커스텀 모드는 선택 기간 합계만)
  let cardsHtml;
  if (periodMode === 'custom') {
    const rangeTotal = data.reduce((s, d) => s + d.count, 0);
    const rangeLabel =
      customRange.from && customRange.to
        ? `${fmtDate(customRange.from)} ~ ${fmtDate(customRange.to)}`
        : '';
    cardsHtml = `<div class="badge-period-cards badge-period-cards--2">
      <div class="badge-period-card">
        <span class="badge-period-label">${rangeLabel || '선택 기간'}</span>
        <span class="badge-period-num">${rangeTotal}</span>
      </div>
      <div class="badge-period-card">
        <span class="badge-period-label">누적 합계</span>
        <span class="badge-period-num">${totalCount}</span>
      </div>
    </div>`;
  } else {
    cardsHtml = `<div class="badge-period-cards">
      <div class="badge-period-card">
        <span class="badge-period-label">${labels.cur}</span>
        <span class="badge-period-num">${current.count}</span>
        <span class="badge-period-diff ${diffClass}">${labels.diff} ${diffLabel}</span>
      </div>
      <div class="badge-period-card">
        <span class="badge-period-label">${labels.prev}</span>
        <span class="badge-period-num">${prev.count}</span>
      </div>
      <div class="badge-period-card">
        <span class="badge-period-label">누적 합계</span>
        <span class="badge-period-num">${totalCount}</span>
      </div>
    </div>`;
  }

  // 그래프
  const chartSvg =
    data.length >= 2
      ? buildLineChart(data)
      : '<div class="badge-timeline-empty">데이터가 부족합니다</div>';

  container.innerHTML = `
    <div class="badge-period-tabs">${tabsHtml}</div>
    ${cardsHtml}
    <div class="badge-chart-line-wrap">${chartSvg}</div>`;

  // 탭 이벤트 위임
  container.querySelectorAll('.badge-period-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.period;
      if (key === 'custom') {
        openDateRangeModal();
        return;
      }
      periodMode = key;
      renderPeriodStats(classId);
    });
  });
}

function getPeriodData(classId) {
  switch (periodMode) {
    case 'monthly':
      return Store.getMonthlyBadgeCounts(classId, 6);
    case 'semester':
      return Store.getSemesterBadgeCounts(classId);
    case 'custom':
      if (customRange.from && customRange.to) {
        return Store.getCustomRangeBadgeCounts(classId, customRange.from, customRange.to);
      }
      return [];
    default:
      return Store.getWeeklyBadgeCounts(classId, 6);
  }
}

function fmtDate(d) {
  const m = d.getMonth() + 1;
  const dd = d.getDate();
  return `${m}/${dd}`;
}

// === 날짜 범위 모달 ===
function openDateRangeModal() {
  const modal = document.getElementById('date-range-modal');
  if (!modal) return;

  // 기본값: 최근 30일
  const now = new Date();
  const from = customRange.from || new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
  const toDate = customRange.to || now;

  const fromInput = document.getElementById('date-range-from');
  const toInput = document.getElementById('date-range-to');
  if (fromInput) fromInput.value = toISODate(from);
  if (toInput) toInput.value = toISODate(toDate);

  modal.style.display = 'flex';
  requestAnimationFrame(() => modal.classList.add('open'));
}

function closeDateRangeModal() {
  const modal = document.getElementById('date-range-modal');
  if (modal) {
    modal.classList.remove('open');
    setTimeout(() => {
      modal.style.display = 'none';
    }, 200);
  }
}

function applyDateRange() {
  const fromVal = document.getElementById('date-range-from')?.value;
  const toVal = document.getElementById('date-range-to')?.value;

  if (!fromVal || !toVal) {
    UI.showToast('시작일과 종료일을 모두 선택해주세요', 'warning');
    return;
  }

  const from = new Date(fromVal);
  const to = new Date(toVal);
  to.setHours(23, 59, 59, 999);

  if (from > to) {
    UI.showToast('시작일이 종료일보다 늦을 수 없습니다', 'warning');
    return;
  }

  customRange = { from, to };
  periodMode = 'custom';
  closeDateRangeModal();

  const cls = Store.getSelectedClass();
  if (cls) renderPeriodStats(cls.id);
}

function toISODate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

// === SVG 꺾은선 그래프 (범용) ===
function buildLineChart(data) {
  const W = 320;
  const H = 140;
  const padL = 32;
  const padR = 12;
  const padT = 20;
  const padB = 28;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;

  const counts = data.map(d => d.count);
  const maxVal = Math.max(...counts, 1);
  const yMax = Math.ceil(maxVal * 1.2) || 1;
  const n = data.length;

  const points = data.map((d, i) => {
    const x = padL + (n > 1 ? (i / (n - 1)) * chartW : chartW / 2);
    const y = padT + chartH - (d.count / yMax) * chartH;
    return { x, y, count: d.count, label: d.label };
  });

  const polyline = points.map(p => `${p.x},${p.y}`).join(' ');

  const areaPath = [
    `M ${points[0].x},${padT + chartH}`,
    ...points.map(p => `L ${p.x},${p.y}`),
    `L ${points[n - 1].x},${padT + chartH}`,
    'Z',
  ].join(' ');

  const yTicks = [0, Math.round(yMax / 2), yMax];
  const yTickLines = yTicks
    .map(v => {
      const y = padT + chartH - (v / yMax) * chartH;
      return `
        <line x1="${padL}" y1="${y}" x2="${W - padR}" y2="${y}" stroke="#e5e7eb" stroke-width="1" />
        <text x="${padL - 6}" y="${y + 4}" text-anchor="end" fill="#9ca3af" font-size="10">${v}</text>`;
    })
    .join('');

  // X축 레이블 (너무 많으면 간격 조절)
  const step = n > 8 ? Math.ceil(n / 6) : 1;
  const xLabels = points
    .filter((_, i) => i % step === 0 || i === n - 1)
    .map(
      p =>
        `<text x="${p.x}" y="${H - 6}" text-anchor="middle" fill="#9ca3af" font-size="10">${p.label}</text>`
    )
    .join('');

  const dots = points
    .map(
      p => `
      <circle cx="${p.x}" cy="${p.y}" r="4" fill="var(--color-primary)" stroke="#fff" stroke-width="2" />
      <text x="${p.x}" y="${p.y - 8}" text-anchor="middle" fill="var(--color-primary)" font-size="10" font-weight="700">${p.count}</text>`
    )
    .join('');

  return `<svg viewBox="0 0 ${W} ${H}" class="badge-line-chart">
    <defs>
      <linearGradient id="chart-grad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="var(--color-primary)" stop-opacity="0.2" />
        <stop offset="100%" stop-color="var(--color-primary)" stop-opacity="0.02" />
      </linearGradient>
    </defs>
    ${yTickLines}
    <path d="${areaPath}" fill="url(#chart-grad)" />
    <polyline points="${polyline}" fill="none" stroke="var(--color-primary)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
    ${dots}
    ${xLabels}
  </svg>`;
}

function renderRankingView() {
  const cls = Store.getSelectedClass();
  if (!cls) return;
  renderStudentRanking(cls.id);
}

function renderStudentRanking(classId) {
  const ranking = Store.getStudentRanking(classId, 0); // 0 = 전체
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

export const ClassStatsUI = {
  init,
  onPageEnter,
};
