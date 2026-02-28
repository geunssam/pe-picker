/**
 * CSV 가져오기 + 일괄등록 모달
 */
import { state } from './state.js';
import { UI } from '../../shared/ui-utils.js';
import { sanitizeGender, sortStudentsByNumber } from './helpers.js';
import { applyImportedStudents } from './modal-editor.js';

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
