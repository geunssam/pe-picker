/**
 * CSV 가져오기 + 일괄등록 모달 + CSV 재업로드 매칭
 */
import { state } from './state.js';
import { UI } from '../../shared/ui-utils.js';
import { Store } from '../../shared/store.js';
import { sanitizeGender, sortStudentsByNumber } from './helpers.js';
import { applyImportedStudents } from './modal-editor.js';
import './csv-reconcile.css';

// ===== CSV 매칭 (Reconcile) =====

/** 매칭 대기 상태 */
let pendingReconciliation = null;

/**
 * CSV 행과 기존 학생을 이름 기반으로 매칭
 * @param {Array} csvRows - parseCSV 결과 [{name, number, gender}]
 * @param {Array} existingStudents - 기존 학생 [{id, name, number, gender, ...}]
 * @returns {{ matched: Array, added: Array, missing: Array, warnings: string[] }}
 */
export function reconcileCSV(csvRows, existingStudents) {
  const warnings = [];
  const matched = []; // { csvRow, student } — 기존 ID 매칭됨
  const added = []; // csvRow — 신규 학생
  const matchedStudentIds = new Set();

  // 이름별 기존 학생 그룹핑
  const byName = new Map();
  for (const s of existingStudents) {
    const name = (s.name || '').trim();
    if (!name) continue;
    if (!byName.has(name)) byName.set(name, []);
    byName.get(name).push(s);
  }

  for (const row of csvRows) {
    const csvName = (row.name || '').trim();
    if (!csvName) continue;

    const candidates = byName.get(csvName);
    if (!candidates || candidates.length === 0) {
      // 매칭 실패 → 신규
      added.push(row);
      continue;
    }

    // 아직 매칭되지 않은 후보만
    const unmatched = candidates.filter(c => !matchedStudentIds.has(c.id));
    if (unmatched.length === 0) {
      // 모든 동명이인이 이미 매칭됨 → 신규
      added.push(row);
      continue;
    }

    if (unmatched.length === 1) {
      // 1명 → 즉시 매칭
      const student = unmatched[0];
      matched.push({ csvRow: row, student });
      matchedStudentIds.add(student.id);
      continue;
    }

    // 동명이인 2명 이상 → 성별로 좁히기
    const csvGender = sanitizeGender(row.gender);
    if (csvGender) {
      const byGender = unmatched.filter(s => s.gender === csvGender);
      if (byGender.length === 1) {
        matched.push({ csvRow: row, student: byGender[0] });
        matchedStudentIds.add(byGender[0].id);
        continue;
      }
    }

    // 번호로 좁히기
    if (row.number > 0) {
      const byNumber = unmatched.filter(s => s.number === row.number);
      if (byNumber.length === 1) {
        matched.push({ csvRow: row, student: byNumber[0] });
        matchedStudentIds.add(byNumber[0].id);
        continue;
      }
    }

    // 여전히 애매 → 첫 번째 자동 매칭 + 경고
    const student = unmatched[0];
    matched.push({ csvRow: row, student });
    matchedStudentIds.add(student.id);
    warnings.push(`동명이인 "${csvName}" — ${student.number}번 학생으로 자동 매칭됨`);
  }

  // CSV에 없는 기존 학생 → 전출 후보
  const missing = existingStudents.filter(s => !matchedStudentIds.has(s.id));

  return { matched, added, missing, warnings };
}

/**
 * 매칭 결과 모달에 데이터 채우기
 */
export function showReconcileModal(result, classId) {
  pendingReconciliation = { ...result, classId };

  const el = document.getElementById('csv-reconcile-modal');
  if (!el) return;

  // 요약 태그
  const summaryEl = el.querySelector('.reconcile-summary');
  if (summaryEl) {
    summaryEl.innerHTML = `
      <span class="reconcile-tag reconcile-tag--kept">유지 ${result.matched.length}명</span>
      <span class="reconcile-tag reconcile-tag--new">신규 ${result.added.length}명</span>
      ${result.missing.length > 0 ? `<span class="reconcile-tag reconcile-tag--missing">전출 ${result.missing.length}명</span>` : ''}
    `;
  }

  // 경고
  const warningEl = el.querySelector('.reconcile-warnings');
  if (warningEl) {
    if (result.warnings.length > 0) {
      warningEl.innerHTML = result.warnings
        .map(w => `<div class="reconcile-warning-item">${UI.escapeHtml(w)}</div>`)
        .join('');
      warningEl.style.display = '';
    } else {
      warningEl.style.display = 'none';
    }
  }

  // 유지 목록 (아코디언)
  const keptListEl = el.querySelector('.reconcile-kept-list');
  if (keptListEl) {
    keptListEl.innerHTML = result.matched
      .map(m => {
        const numChanged = m.csvRow.number !== m.student.number;
        const numNote = numChanged
          ? ` <span class="reconcile-num-change">${m.student.number}→${m.csvRow.number}</span>`
          : '';
        return `<div class="reconcile-student-row">${m.csvRow.number}. ${UI.escapeHtml(m.csvRow.name)}${numNote}</div>`;
      })
      .join('');
  }

  // 신규 목록 (아코디언)
  const newListEl = el.querySelector('.reconcile-new-list');
  if (newListEl) {
    newListEl.innerHTML = result.added
      .map(
        r =>
          `<div class="reconcile-student-row reconcile-student-row--new">${r.number}. ${UI.escapeHtml(r.name)}</div>`
      )
      .join('');
  }

  // 전출 학생 섹션
  const missingSection = el.querySelector('.reconcile-missing-section');
  const missingListEl = el.querySelector('.reconcile-missing-list');
  if (missingSection && missingListEl) {
    if (result.missing.length > 0) {
      missingSection.style.display = '';
      // 배지 수 조회
      missingListEl.innerHTML = result.missing
        .map(s => {
          const badgeCount = Store.getBadgeLogsByStudent(classId, s.id).length;
          const badgeText = badgeCount > 0 ? `배지 ${badgeCount}개` : '배지 없음';
          return `<div class="reconcile-missing-row" data-student-id="${UI.escapeHtml(s.id)}">
            <span class="reconcile-missing-name">${s.number}. ${UI.escapeHtml(s.name)}</span>
            <span class="reconcile-missing-badge">${badgeText}</span>
            <button type="button" class="reconcile-badge-toggle" data-keep="true">배지 유지</button>
          </div>`;
        })
        .join('');
    } else {
      missingSection.style.display = 'none';
    }
  }

  UI.showModal('csv-reconcile-modal');
}

/**
 * "적용" 버튼 핸들러
 */
export function applyReconciliation() {
  if (!pendingReconciliation) return;

  const { matched, added, missing, classId } = pendingReconciliation;

  // matched → 기존 ID + CSV 번호/성별 + 기존 확장 필드 유지
  const finalRows = matched.map(m => ({
    id: m.student.id,
    name: m.csvRow.name,
    number: m.csvRow.number,
    gender: sanitizeGender(m.csvRow.gender) || m.student.gender,
    team: m.student.team || '',
    sportsAbility: m.student.sportsAbility || '',
    tags: m.student.tags || [],
    note: m.student.note || '',
  }));

  // added → ID 없이 전달 (createModalStudent이 새 ID 생성)
  for (const row of added) {
    finalRows.push({
      name: row.name,
      number: row.number,
      gender: sanitizeGender(row.gender),
    });
  }

  // missing 중 "배지 삭제" 선택된 학생 처리
  const modal = document.getElementById('csv-reconcile-modal');
  if (modal && classId) {
    const deleteIds = [];
    modal.querySelectorAll('.reconcile-missing-row').forEach(rowEl => {
      const toggleBtn = rowEl.querySelector('.reconcile-badge-toggle');
      if (toggleBtn && toggleBtn.dataset.keep === 'false') {
        const sid = rowEl.dataset.studentId;
        if (sid) deleteIds.push(sid);
      }
    });
    if (deleteIds.length > 0) {
      Store.removeBadgeLogsForStudents(classId, deleteIds);
    }
  }

  const count = applyImportedStudents(finalRows);
  closeReconcileModal();
  if (count > 0) {
    UI.showToast(`${count}명 매칭 적용 완료`, 'success');
  }

  pendingReconciliation = null;
}

/**
 * 모달 닫기
 */
export function closeReconcileModal() {
  UI.hideModal('csv-reconcile-modal');
  pendingReconciliation = null;
}

/**
 * 모달 내 클릭 이벤트 위임
 */
export function handleReconcileModalClick(event) {
  const target = event.target;
  if (!target) return;

  // 아코디언 토글
  const accordionBtn = target.closest('.reconcile-accordion-btn');
  if (accordionBtn) {
    const content = accordionBtn.nextElementSibling;
    if (content) {
      const isOpen = content.classList.toggle('open');
      accordionBtn.classList.toggle('open', isOpen);
    }
    return;
  }

  // 배지 유지/삭제 토글
  const toggleBtn = target.closest('.reconcile-badge-toggle');
  if (toggleBtn) {
    const isKeep = toggleBtn.dataset.keep === 'true';
    toggleBtn.dataset.keep = isKeep ? 'false' : 'true';
    toggleBtn.textContent = isKeep ? '배지 삭제' : '배지 유지';
    toggleBtn.classList.toggle('reconcile-badge-delete', isKeep);
    return;
  }
}

// ===== 일괄등록 모달 =====

export function buildBulkModalRowsFromStudents() {
  const sortedStudents = [...state.rosterStudents].sort(sortStudentsByNumber);

  if (sortedStudents.length === 0) {
    // 학생 없으면 20행 빈 카드
    const rows = [];
    for (let i = 0; i < 20; i++) {
      rows.push({ number: i + 1, name: '', gender: '', id: '' });
    }
    return rows;
  }

  // 기존 학생의 최대 번호까지 행 생성 (갭 포함, id 보존)
  const maxNumber = Math.max(...sortedStudents.map(s => s.number));
  const studentByNumber = new Map(sortedStudents.map(s => [s.number, s]));

  const rows = [];
  for (let num = 1; num <= maxNumber; num++) {
    const student = studentByNumber.get(num);
    rows.push({
      number: num,
      name: student?.name || '',
      gender: sanitizeGender(student?.gender),
      id: student?.id || '',
    });
  }
  return rows;
}

export function renderBulkModalRows() {
  const listEl = document.getElementById('class-bulk-card-list');
  if (!listEl) return;

  listEl.innerHTML = state.bulkModalRows
    .map((row, idx) => {
      const maleActive = row.gender === 'male' ? ' active-male' : '';
      const femaleActive = row.gender === 'female' ? ' active-female' : '';
      return `<div class="roster-input-card" data-row-index="${idx}">
          <span class="roster-number">${row.number}</span>
          <input type="text" class="class-bulk-name-input roster-name-input" maxlength="20"
                 data-row-index="${idx}"
                 value="${UI.escapeHtml(row.name || '')}" placeholder="이름">
          <div class="roster-gender-toggle">
            <button type="button" class="roster-gender-btn class-bulk-gender-btn${maleActive}" data-gender="male" data-row-index="${idx}">남</button>
            <button type="button" class="roster-gender-btn class-bulk-gender-btn${femaleActive}" data-gender="female" data-row-index="${idx}">여</button>
          </div>
        </div>`;
    })
    .join('');
}

export function switchBulkMode(mode) {
  state.bulkModalMode = mode;

  // 세그먼트 버튼 active 토글
  document.querySelectorAll('.bulk-mode-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mode === mode);
  });

  // 섹션 표시/숨김
  const rangeSection = document.getElementById('bulk-gender-range-section');
  const toolbar = document.getElementById('bulk-sequential-toolbar');
  if (rangeSection) rangeSection.style.display = mode === 'gender-range' ? '' : 'none';
  if (toolbar) toolbar.style.display = mode === 'sequential' ? '' : 'none';
}

export async function generateGenderRangeRows() {
  const maleStart = parseInt(document.getElementById('bulk-gender-male-start')?.value, 10);
  const maleEnd = parseInt(document.getElementById('bulk-gender-male-end')?.value, 10);
  const femaleStart = parseInt(document.getElementById('bulk-gender-female-start')?.value, 10);
  const femaleEnd = parseInt(document.getElementById('bulk-gender-female-end')?.value, 10);

  const hasMale = Number.isFinite(maleStart) && Number.isFinite(maleEnd);
  const hasFemale = Number.isFinite(femaleStart) && Number.isFinite(femaleEnd);

  if (!hasMale && !hasFemale) {
    UI.showToast('남학생 또는 여학생 번호 범위를 입력해주세요', 'error');
    return;
  }

  // 유효성: 시작 > 끝
  if (hasMale && maleStart > maleEnd) {
    UI.showToast('남학생 시작 번호가 끝 번호보다 큽니다', 'error');
    return;
  }
  if (hasFemale && femaleStart > femaleEnd) {
    UI.showToast('여학생 시작 번호가 끝 번호보다 큽니다', 'error');
    return;
  }

  // 유효성: 범위 겹침
  if (hasMale && hasFemale) {
    const maleRange = [maleStart, maleEnd];
    const femaleRange = [femaleStart, femaleEnd];
    if (maleRange[0] <= femaleRange[1] && femaleRange[0] <= maleRange[1]) {
      UI.showToast('남학생과 여학생 번호 범위가 겹칩니다', 'error');
      return;
    }
  }

  // 기존 이름 데이터 경고
  const hasData = state.bulkModalRows.some(r => r.name?.trim());
  if (hasData) {
    const ok = await UI.showConfirm('입력된 이름 데이터가 초기화됩니다.\n계속하시겠습니까?', {
      confirmText: '계속',
    });
    if (!ok) return;
  }

  // 행 생성
  const rows = [];
  if (hasMale) {
    for (let n = maleStart; n <= maleEnd; n++) {
      rows.push({ number: n, name: '', gender: 'male', id: '' });
    }
  }
  if (hasFemale) {
    for (let n = femaleStart; n <= femaleEnd; n++) {
      rows.push({ number: n, name: '', gender: 'female', id: '' });
    }
  }

  // 번호순 정렬
  rows.sort((a, b) => a.number - b.number);

  state.bulkModalRows = rows;
  renderBulkModalRows();

  const total = rows.length;
  UI.showToast(`${total}명의 명렬표가 생성되었습니다`, 'success');
}

export function openBulkRegistrationModal() {
  state.bulkModalMode = 'sequential';
  state.bulkModalRows = buildBulkModalRowsFromStudents();
  switchBulkMode('sequential');
  renderBulkModalRows();
  UI.showModal('class-bulk-modal');
}

export function closeBulkRegistrationModal() {
  UI.hideModal('class-bulk-modal');
  state.bulkModalRows = [];
}

function showNumberPrompt(message, defaultValue = 1) {
  return new Promise(resolve => {
    document.getElementById('ui-prompt-modal')?.remove();

    const modal = document.createElement('div');
    modal.id = 'ui-prompt-modal';
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-alert">
        <div class="modal-alert-body">
          <div class="modal-alert-message">${UI.escapeHtml(message)}</div>
          <input type="number" class="input prompt-number-input"
                 value="${defaultValue}" min="1" max="99"
                 style="margin-top:var(--space-sm);text-align:center;font-size:var(--font-size-lg)">
          <div class="confirm-btn-row">
            <button class="btn-confirm-cancel">취소</button>
            <button class="btn-confirm-ok">추가</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    requestAnimationFrame(() => modal.classList.add('show'));

    const input = modal.querySelector('.prompt-number-input');
    input.focus();
    input.select();

    const close = value => {
      modal.classList.remove('show');
      setTimeout(() => modal.remove(), 200);
      resolve(value);
    };

    modal.querySelector('.btn-confirm-cancel').addEventListener('click', () => close(null));
    modal.querySelector('.btn-confirm-ok').addEventListener('click', () => {
      const val = parseInt(input.value, 10);
      close(Number.isFinite(val) && val > 0 ? val : null);
    });
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        const val = parseInt(input.value, 10);
        close(Number.isFinite(val) && val > 0 ? val : null);
      }
    });
    modal.addEventListener('click', e => {
      if (e.target === modal) close(null);
    });
  });
}

export async function addBulkModalRow() {
  const count = await showNumberPrompt('추가할 학생 수를 입력하세요');
  if (!count) return;

  const maxNumber =
    state.bulkModalRows.length > 0 ? Math.max(...state.bulkModalRows.map(r => r.number)) : 0;
  for (let i = 1; i <= count; i++) {
    state.bulkModalRows.push({
      number: maxNumber + i,
      name: '',
      gender: '',
    });
  }
  renderBulkModalRows();
}

export function removeBulkModalRow() {
  if (state.bulkModalRows.length <= 1) {
    UI.showToast('최소 1명의 학생은 유지해야 합니다', 'info');
    return;
  }
  state.bulkModalRows.pop();
  renderBulkModalRows();
}

export function applyBulkRegistrationModal() {
  const listEl = document.getElementById('class-bulk-card-list');
  if (!listEl) return;

  const rows = Array.from(listEl.querySelectorAll('.roster-input-card')).map((cardEl, idx) => {
    const name = cardEl.querySelector('.class-bulk-name-input')?.value?.trim() || '';
    // 성별은 active 클래스에서 읽기
    let gender = '';
    const maleBtn = cardEl.querySelector('.class-bulk-gender-btn[data-gender="male"]');
    const femaleBtn = cardEl.querySelector('.class-bulk-gender-btn[data-gender="female"]');
    if (maleBtn?.classList.contains('active-male')) gender = 'male';
    else if (femaleBtn?.classList.contains('active-female')) gender = 'female';
    // 행의 표시 번호(원본 번호)와 기존 id 유지
    const bulkRow = state.bulkModalRows[idx];
    const rowNumber = bulkRow?.number || idx + 1;
    const rowId = bulkRow?.id || '';
    return { number: rowNumber, name, gender: sanitizeGender(gender), id: rowId };
  });

  const count = applyImportedStudents(rows);
  if (count <= 0) return;

  closeBulkRegistrationModal();
  UI.showToast(`${count}명의 학생 명렬표를 적용했습니다`, 'success');
}

export function handleBulkModalInput(event) {
  const target = event.target;
  if (!target) return;

  const rowIndex = parseInt(target.dataset.rowIndex, 10);
  if (!Number.isFinite(rowIndex) || !state.bulkModalRows[rowIndex]) return;

  if (target.classList.contains('class-bulk-name-input')) {
    state.bulkModalRows[rowIndex].name = target.value;
  }
}

export function handleBulkModalClick(event) {
  const target = event.target;
  if (!target) return;

  // 모드 전환 버튼
  const modeBtn = target.closest('.bulk-mode-btn');
  if (modeBtn) {
    const mode = modeBtn.dataset.mode;
    if (mode && mode !== state.bulkModalMode) switchBulkMode(mode);
    return;
  }

  const genderBtn = target.closest('.class-bulk-gender-btn');
  if (!genderBtn) return;

  const rowIndex = parseInt(genderBtn.dataset.rowIndex, 10);
  if (!Number.isFinite(rowIndex) || !state.bulkModalRows[rowIndex]) return;

  const clickedGender = genderBtn.dataset.gender;
  const card = genderBtn.closest('.roster-input-card');
  if (!card) return;

  // 모든 성별 버튼 해제
  card.querySelectorAll('.class-bulk-gender-btn').forEach(btn => {
    btn.classList.remove('active-male', 'active-female');
  });

  // 같은 성별이면 해제, 다르면 활성화
  if (state.bulkModalRows[rowIndex].gender === clickedGender) {
    state.bulkModalRows[rowIndex].gender = '';
  } else {
    state.bulkModalRows[rowIndex].gender = sanitizeGender(clickedGender);
    const cls = clickedGender === 'male' ? 'active-male' : 'active-female';
    genderBtn.classList.add(cls);
  }
}

// ===== CSV 파싱 =====

const CSV_MAX_LINES = 200;
const CSV_MAX_FILE_SIZE = 512 * 1024; // 512KB

export function parseCSV(content) {
  const lines = content
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean);

  if (lines.length === 0) return [];

  if (lines.length > CSV_MAX_LINES) {
    UI.showToast(`CSV 최대 ${CSV_MAX_LINES}행까지 지원합니다 (현재 ${lines.length}행)`, 'error');
    return [];
  }

  const delimiter = lines[0].includes('\t') ? '\t' : ',';
  const headerKeywords = ['이름', '성명', 'name', '학생'];
  const numberKeywords = ['번호', 'num', 'number'];
  const genderKeywords = ['성별', 'gender', 'sex'];

  const firstCols = lines[0].split(delimiter).map(col => col.trim().toLowerCase());
  const hasHeader = headerKeywords.some(keyword => firstCols.some(col => col.includes(keyword)));

  let nameColIdx = 0;
  let numberColIdx = -1;
  let genderColIdx = -1;

  if (hasHeader) {
    const findByKeywords = keywords => {
      return firstCols.findIndex(col => keywords.some(keyword => col.includes(keyword)));
    };

    const detectedName = findByKeywords(headerKeywords);
    if (detectedName !== -1) nameColIdx = detectedName;

    numberColIdx = findByKeywords(numberKeywords);
    genderColIdx = findByKeywords(genderKeywords);
  }

  const startIdx = hasHeader ? 1 : 0;
  const rows = [];

  for (let i = startIdx; i < lines.length; i++) {
    const cols = lines[i].split(delimiter).map(col => col.trim());
    const name = (cols[nameColIdx] || '').trim();
    if (!name) continue;

    const numberRaw = numberColIdx >= 0 ? parseInt(cols[numberColIdx], 10) : NaN;
    const genderRaw = genderColIdx >= 0 ? cols[genderColIdx] : '';

    rows.push({
      name,
      number: Number.isFinite(numberRaw) && numberRaw > 0 ? numberRaw : i - startIdx + 1,
      gender: sanitizeGender(genderRaw),
    });
  }

  return rows;
}

// ===== CSV 파일 처리 =====

export function handleCSVImport(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  if (file.size > CSV_MAX_FILE_SIZE) {
    UI.showToast('파일 크기가 512KB를 초과합니다', 'error');
    event.target.value = '';
    return;
  }

  const reader = new FileReader();
  reader.onload = loadEvent => {
    const content = loadEvent.target?.result || '';
    const rows = parseCSV(content);
    if (rows.length === 0) {
      UI.showToast('학생을 찾을 수 없습니다', 'error');
      return;
    }

    // 기존 학생이 있으면 매칭 모달 표시
    const existing = state.rosterStudents || [];
    if (existing.length > 0) {
      const result = reconcileCSV(rows, existing);
      const classId = state.editingClassId || '';
      showReconcileModal(result, classId);
      return;
    }

    // 빈 학급 → 기존 동작 (바로 적용)
    const count = applyImportedStudents(rows);
    if (count > 0) UI.showToast(`${count}명 가져오기 완료`, 'success');
  };
  reader.readAsText(file, 'UTF-8');

  // 파일 입력 초기화 (같은 파일 재선택 가능)
  event.target.value = '';
}

export function downloadCSVTemplate() {
  let csvContent = '\uFEFF번호,이름,성별\n';

  for (let i = 1; i <= 30; i++) {
    csvContent += `${i},,\n`;
  }

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = '학급_명렬표_템플릿.csv';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);

  UI.showToast('명렬표 템플릿 다운로드 완료', 'success');
}
