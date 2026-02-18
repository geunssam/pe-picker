/**
 * CSV 가져오기 + 일괄등록 모달
 */
import { state } from './state.js';
import { UI } from '../shared/ui-utils.js';
import { sanitizeGender, sortStudentsByNumber } from './helpers.js';
import { applyImportedStudents } from './modal-editor.js';

// ===== 일괄등록 모달 =====

export function buildBulkModalRowsFromStudents() {
  const sortedStudents = [...state.modalStudents].sort(sortStudentsByNumber);
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
  const bodyEl = document.getElementById('class-bulk-table-body');
  if (!bodyEl) return;

  bodyEl.innerHTML = state.bulkModalRows
    .map(
      (row, idx) => `
      <tr>
        <td><span class="class-bulk-index">${idx + 1}</span></td>
        <td>
          <input
            type="text"
            class="class-bulk-name-input"
            data-row-index="${idx}"
            value="${UI.escapeHtml(row.name || '')}"
            maxlength="20"
            placeholder="학생 이름"
          >
        </td>
        <td>
          <select class="class-bulk-gender-select" data-row-index="${idx}">
            <option value="" ${!row.gender ? 'selected' : ''}>-</option>
            <option value="male" ${row.gender === 'male' ? 'selected' : ''}>남</option>
            <option value="female" ${row.gender === 'female' ? 'selected' : ''}>여</option>
          </select>
        </td>
      </tr>
    `
    )
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
  const bodyEl = document.getElementById('class-bulk-table-body');
  if (!bodyEl) return;

  const rows = Array.from(bodyEl.querySelectorAll('tr')).map((rowEl, idx) => {
    const name = rowEl.querySelector('.class-bulk-name-input')?.value?.trim() || '';
    const gender = sanitizeGender(rowEl.querySelector('.class-bulk-gender-select')?.value || '');
    return { number: idx + 1, name, gender };
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
    return;
  }

  if (target.classList.contains('class-bulk-gender-select')) {
    state.bulkModalRows[rowIndex].gender = sanitizeGender(target.value);
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
