/**
 * CSV 가져오기 + 일괄등록 모달
 */
import { state } from './state.js';
import { UI } from '../shared/ui-utils.js';
import { sanitizeGender, sortStudentsByNumber } from './helpers.js';
import { applyImportedStudents } from './modal-editor.js';

// ===== 일괄등록 모달 =====

export function buildBulkModalRowsFromStudents() {
  const sortedStudents = [...state.rosterStudents].sort(sortStudentsByNumber);
  const targetCount = sortedStudents.length > 0 ? sortedStudents.length : 20;

  const rows = [];
  for (let i = 0; i < targetCount; i++) {
    const student = sortedStudents[i];
    rows.push({
      number: i + 1,
      name: student?.name || '',
      gender: sanitizeGender(student?.gender),
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
          <span class="roster-number">${idx + 1}</span>
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

export function openBulkRegistrationModal() {
  state.bulkModalRows = buildBulkModalRowsFromStudents();
  renderBulkModalRows();
  UI.showModal('class-bulk-modal');
}

export function closeBulkRegistrationModal() {
  UI.hideModal('class-bulk-modal');
  state.bulkModalRows = [];
}

export function addBulkModalRow() {
  state.bulkModalRows.push({
    number: state.bulkModalRows.length + 1,
    name: '',
    gender: '',
  });
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
    return { number: idx + 1, name, gender: sanitizeGender(gender) };
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

export function parseCSV(content) {
  const lines = content
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean);

  if (lines.length === 0) return [];

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

  const reader = new FileReader();
  reader.onload = loadEvent => {
    const content = loadEvent.target?.result || '';
    const rows = parseCSV(content);
    if (rows.length === 0) {
      UI.showToast('학생을 찾을 수 없습니다', 'error');
      return;
    }

    const count = applyImportedStudents(rows);
    if (count > 0) UI.showToast(`${count}명 가져오기 완료`, 'success');
  };
  reader.readAsText(file, 'UTF-8');
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
