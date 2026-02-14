/* ============================================
   PE Picker - Class Manager (학급/학생 관리)
   두 기능(술래뽑기, 모둠뽑기)에서 공유
   v3: 학생 카드 + 모둠 드래그 편집
   ============================================ */

import { Store } from './store.js';
import { UI } from './ui-utils.js';
import { generateId } from '../storage/base-repo.js';

let editingClassId = null;
let onSaveCallback = null;
let initialized = false;

// 모달 편집 상태
let modalStudents = []; // [{id,name,number,gender,sportsAbility,tags,note}]
let modalUnassigned = []; // [studentId]
let modalGroups = []; // [[studentId,...], ...]
let modalGroupNames = []; // [name,...]
let draggedStudentId = null;
let bulkModalRows = []; // [{number,name,gender}]

function sanitizeGender(value) {
  if (value === 'male' || value === '남' || value === '남자') return 'male';
  if (value === 'female' || value === '여' || value === '여자') return 'female';
  return '';
}

function getGoogleSyncContext() {
  const user = window.AuthManager ? window.AuthManager.getCurrentUser() : null;
  if (!user || user.mode !== 'google' || !user.uid) return null;

  const db = window.FirebaseConfig ? window.FirebaseConfig.getFirestore() : null;
  if (!db) return null;

  return { user, db };
}

function normalizeStudentName(student) {
  if (typeof student === 'string') return student.trim();
  if (student && typeof student.name === 'string') return student.name.trim();
  return '';
}

function normalizeGroupMembers(groups) {
  if (!Array.isArray(groups)) return [];
  return groups.map(group =>
    Array.isArray(group) ? group.map(member => normalizeStudentName(member)).filter(Boolean) : []
  );
}

function encodeGroupsForFirestore(groups) {
  const encoded = {};
  if (!Array.isArray(groups)) return encoded;

  groups.forEach((members, idx) => {
    const key = `g${idx}`;
    encoded[key] = Array.isArray(members) ? members.filter(Boolean) : [];
  });

  return encoded;
}

function extractGradeFromClassName(className) {
  const matched = className.match(/(\d+)/);
  return matched ? matched[1] : '';
}

function sortStudentsByNumber(a, b) {
  const numA = parseInt(a.number, 10);
  const numB = parseInt(b.number, 10);
  const safeA = Number.isFinite(numA) && numA > 0 ? numA : Number.MAX_SAFE_INTEGER;
  const safeB = Number.isFinite(numB) && numB > 0 ? numB : Number.MAX_SAFE_INTEGER;
  if (safeA !== safeB) return safeA - safeB;
  return (a.name || '').localeCompare(b.name || '', 'ko');
}

function createModalStudent(rawStudent = {}, fallbackNumber = 0) {
  const hasObject = rawStudent && typeof rawStudent === 'object';
  const name = normalizeStudentName(rawStudent);
  const numberCandidate = hasObject ? parseInt(rawStudent.number, 10) : NaN;

  return {
    id: hasObject && rawStudent.id ? `${rawStudent.id}` : `student-${generateId()}`,
    name,
    number:
      Number.isFinite(numberCandidate) && numberCandidate > 0 ? numberCandidate : fallbackNumber,
    gender: hasObject ? sanitizeGender(rawStudent.gender) : '',
    sportsAbility:
      hasObject && typeof rawStudent.sportsAbility === 'string' ? rawStudent.sportsAbility : '',
    tags: hasObject && Array.isArray(rawStudent.tags) ? rawStudent.tags : [],
    note: hasObject && typeof rawStudent.note === 'string' ? rawStudent.note : '',
  };
}

function getStudentById(studentId) {
  return modalStudents.find(student => student.id === studentId) || null;
}

function removeStudentFromAllZones(studentId) {
  modalUnassigned = modalUnassigned.filter(id => id !== studentId);
  modalGroups = modalGroups.map(group => group.filter(id => id !== studentId));
}

function sanitizeModalZones() {
  const existingIds = new Set(modalStudents.map(student => student.id));
  const used = new Set();

  modalGroups = modalGroups.map(group => {
    const next = [];
    group.forEach(studentId => {
      if (!existingIds.has(studentId)) return;
      if (used.has(studentId)) return;
      used.add(studentId);
      next.push(studentId);
    });
    return next;
  });

  const nextUnassigned = [];
  modalUnassigned.forEach(studentId => {
    if (!existingIds.has(studentId)) return;
    if (used.has(studentId)) return;
    used.add(studentId);
    nextUnassigned.push(studentId);
  });

  modalStudents.forEach(student => {
    if (used.has(student.id)) return;
    used.add(student.id);
    nextUnassigned.push(student.id);
  });

  modalUnassigned = nextUnassigned;
}

function ensureModalGroupCount(groupCount) {
  const count = Math.max(2, Math.min(8, parseInt(groupCount, 10) || 6));
  const defaultNames = Store.getDefaultGroupNames();

  if (modalGroups.length > count) {
    const removedGroups = modalGroups.slice(count);
    const movedToUnassigned = removedGroups.flat();
    modalGroups = modalGroups.slice(0, count);
    modalUnassigned = [...modalUnassigned, ...movedToUnassigned];
  } else {
    while (modalGroups.length < count) {
      modalGroups.push([]);
    }
  }

  if (modalGroupNames.length > count) {
    modalGroupNames = modalGroupNames.slice(0, count);
  } else {
    while (modalGroupNames.length < count) {
      const idx = modalGroupNames.length;
      modalGroupNames.push(defaultNames[idx] || `${idx + 1}모둠`);
    }
  }

  sanitizeModalZones();
  return count;
}

function initializeModalState(cls, groupCount) {
  modalStudents = [];
  modalUnassigned = [];
  modalGroups = [];
  modalGroupNames = [];

  const count = ensureModalGroupCount(groupCount);
  const defaultNames = Store.getDefaultGroupNames();

  for (let i = 0; i < count; i++) {
    modalGroupNames[i] = (cls?.groupNames?.[i] || defaultNames[i] || `${i + 1}모둠`).trim();
  }

  if (!cls) return;

  const sourceStudents = Array.isArray(cls.students) ? cls.students : [];

  if (sourceStudents.length > 0) {
    modalStudents = sourceStudents.map((student, idx) => createModalStudent(student, idx + 1));
  } else if (Array.isArray(cls.groups)) {
    const flattened = [];
    cls.groups.forEach(group => {
      if (!Array.isArray(group)) return;
      group.forEach(member => {
        const name = normalizeStudentName(member);
        if (!name) return;
        flattened.push({ name });
      });
    });
    modalStudents = flattened.map((student, idx) => createModalStudent(student, idx + 1));
  }

  if (modalStudents.length === 0) return;

  modalStudents.sort(sortStudentsByNumber);
  modalStudents.forEach((student, idx) => {
    if (!student.number || student.number < 1) student.number = idx + 1;
  });

  const usedIds = new Set();

  if (Array.isArray(cls.groups) && cls.groups.length > 0) {
    for (let groupIdx = 0; groupIdx < count; groupIdx++) {
      const groupMembers = Array.isArray(cls.groups[groupIdx]) ? cls.groups[groupIdx] : [];

      groupMembers.forEach(member => {
        const memberName = normalizeStudentName(member);
        if (!memberName) return;

        const matched = modalStudents.find(
          student => !usedIds.has(student.id) && student.name === memberName
        );
        if (matched) {
          modalGroups[groupIdx].push(matched.id);
          usedIds.add(matched.id);
          return;
        }

        // 기존 groups에는 있지만 students에 누락된 경우 보정
        const fallback = createModalStudent({ name: memberName }, modalStudents.length + 1);
        modalStudents.push(fallback);
        modalGroups[groupIdx].push(fallback.id);
        usedIds.add(fallback.id);
      });
    }
  }

  modalStudents.forEach(student => {
    if (usedIds.has(student.id)) return;
    modalUnassigned.push(student.id);
  });

  sanitizeModalZones();
}

function buildBulkModalRowsFromStudents() {
  const sortedStudents = [...modalStudents].sort(sortStudentsByNumber);
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

function renderBulkModalRows() {
  const bodyEl = document.getElementById('class-bulk-table-body');
  if (!bodyEl) return;

  bodyEl.innerHTML = bulkModalRows
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

function openBulkRegistrationModal() {
  bulkModalRows = buildBulkModalRowsFromStudents();
  renderBulkModalRows();
  UI.showModal('class-bulk-modal');
}

function closeBulkRegistrationModal() {
  UI.hideModal('class-bulk-modal');
  bulkModalRows = [];
}

function addBulkModalRow() {
  bulkModalRows.push({
    number: bulkModalRows.length + 1,
    name: '',
    gender: '',
  });
  renderBulkModalRows();
}

function removeBulkModalRow() {
  if (bulkModalRows.length <= 1) {
    UI.showToast('최소 1명의 학생은 유지해야 합니다', 'info');
    return;
  }
  bulkModalRows.pop();
  renderBulkModalRows();
}

function applyBulkRegistrationModal() {
  const bodyEl = document.getElementById('class-bulk-table-body');
  if (!bodyEl) return;

  const rows = Array.from(bodyEl.querySelectorAll('tr')).map((rowEl, idx) => {
    const name = rowEl.querySelector('.class-bulk-name-input')?.value?.trim() || '';
    const gender = sanitizeGender(rowEl.querySelector('.class-bulk-gender-select')?.value || '');
    return {
      number: idx + 1,
      name,
      gender,
    };
  });

  const count = applyImportedStudents(rows);
  if (count <= 0) return;

  closeBulkRegistrationModal();
  UI.showToast(`${count}명의 학생 명렬표를 적용했습니다`, 'success');
}

function handleBulkModalInput(event) {
  const target = event.target;
  if (!target) return;

  const rowIndex = parseInt(target.dataset.rowIndex, 10);
  if (!Number.isFinite(rowIndex) || !bulkModalRows[rowIndex]) return;

  if (target.classList.contains('class-bulk-name-input')) {
    bulkModalRows[rowIndex].name = target.value;
    return;
  }

  if (target.classList.contains('class-bulk-gender-select')) {
    bulkModalRows[rowIndex].gender = sanitizeGender(target.value);
  }
}

function applyImportedStudents(importedRows) {
  const nextStudents = importedRows
    .map((row, idx) => {
      const normalized = typeof row === 'string' ? { name: row, number: idx + 1, gender: '' } : row;
      const student = createModalStudent(normalized, idx + 1);
      if (!student.name) return null;
      return student;
    })
    .filter(Boolean)
    .sort(sortStudentsByNumber)
    .map((student, idx) => ({ ...student, number: idx + 1 }));

  if (nextStudents.length === 0) {
    UI.showToast('학생을 찾을 수 없습니다', 'error');
    return 0;
  }

  modalStudents = nextStudents;
  modalUnassigned = modalStudents.map(student => student.id);

  const groupCountInput = document.getElementById('class-group-count');
  const groupCount = ensureModalGroupCount(parseInt(groupCountInput?.value, 10) || 6);
  if (groupCountInput) groupCountInput.value = groupCount;

  modalGroups = Array.from({ length: groupCount }, () => []);

  sanitizeModalZones();
  renderModalEditor();

  return nextStudents.length;
}

function normalizeStudentNumbers() {
  modalStudents = [...modalStudents].sort(sortStudentsByNumber).map((student, idx) => ({
    ...student,
    number: idx + 1,
  }));
}

function addStudentCard() {
  const student = createModalStudent(
    { name: '', number: modalStudents.length + 1, gender: '' },
    modalStudents.length + 1
  );
  modalStudents.push(student);
  modalUnassigned.push(student.id);

  normalizeStudentNumbers();
  sanitizeModalZones();
  renderModalEditor();

  setTimeout(() => {
    const nameInput = document.querySelector(
      `.cm-student-card[data-student-id="${student.id}"] .cm-name-input`
    );
    nameInput?.focus();
  }, 0);
}

function removeStudent(studentId) {
  modalStudents = modalStudents.filter(student => student.id !== studentId);
  removeStudentFromAllZones(studentId);
  normalizeStudentNumbers();
  sanitizeModalZones();
  renderModalEditor();
}

function getGroupIndexByStudentName(groups, studentName) {
  for (let i = 0; i < groups.length; i++) {
    if (groups[i].includes(studentName)) return i;
  }
  return -1;
}

function renderStudentCardHTML(student) {
  if (!student) return '';

  const selectedMale = student.gender === 'male' ? 'selected' : '';
  const selectedFemale = student.gender === 'female' ? 'selected' : '';
  const selectedUnknown =
    student.gender !== 'male' && student.gender !== 'female' ? 'selected' : '';

  return `
      <div class="cm-student-card" draggable="true" data-student-id="${UI.escapeHtml(student.id)}">
        <div class="cm-card-top">
          <span class="cm-card-drag" title="드래그하여 이동">⋮⋮</span>
          <button type="button" class="cm-remove-student-btn" data-student-id="${UI.escapeHtml(student.id)}" title="학생 삭제">✕</button>
        </div>
        <div class="cm-card-fields">
          <div class="cm-card-field">
            <span>번호</span>
            <span class="cm-student-no">${UI.escapeHtml(student.number || 0)}번</span>
          </div>
          <label class="cm-card-field">
            <span>이름</span>
            <input type="text" class="cm-name-input" maxlength="20" value="${UI.escapeHtml(student.name)}" placeholder="이름">
          </label>
          <label class="cm-card-field">
            <span>성별</span>
            <select class="cm-gender-select">
              <option value="" ${selectedUnknown}>-</option>
              <option value="male" ${selectedMale}>남</option>
              <option value="female" ${selectedFemale}>여</option>
            </select>
          </label>
        </div>
      </div>
    `;
}

function renderRosterSection() {
  const rosterEl = document.getElementById('class-student-roster');
  const countEl = document.getElementById('class-roster-count');
  if (!rosterEl) return;

  const cardsHTML = modalUnassigned
    .map(studentId => renderStudentCardHTML(getStudentById(studentId)))
    .join('');

  rosterEl.innerHTML =
    cardsHTML ||
    `
      <div class="cm-empty-zone">
        미배정 학생이 없습니다. 모둠 카드도 여기로 드래그하면 다시 명렬표로 돌아옵니다.
      </div>
    `;

  if (countEl) countEl.textContent = `${modalUnassigned.length}명`;
}

function renderGroupSection() {
  const boardEl = document.getElementById('class-group-assign-board');
  if (!boardEl) return;

  const columnsHTML = modalGroups
    .map((groupStudentIds, groupIdx) => {
      const groupName = modalGroupNames[groupIdx] || `${groupIdx + 1}모둠`;
      const cardsHTML = groupStudentIds
        .map(studentId => renderStudentCardHTML(getStudentById(studentId)))
        .join('');

      return `
        <div class="cm-group-column">
          <div class="cm-group-header">
            <input
              type="text"
              class="cm-group-name-input"
              data-group-index="${groupIdx}"
              maxlength="10"
              value="${UI.escapeHtml(groupName)}"
              placeholder="${groupIdx + 1}모둠"
            >
            <span class="cm-group-count">${groupStudentIds.length}명</span>
          </div>
          <div class="cm-group-list cm-drop-zone" data-zone-type="group" data-group-index="${groupIdx}">
            ${cardsHTML || '<div class="cm-empty-zone">여기에 학생 카드를 드래그하세요</div>'}
          </div>
        </div>
      `;
    })
    .join('');

  boardEl.innerHTML = columnsHTML;
}

function clearDropHighlights() {
  document.querySelectorAll('.cm-drop-zone.cm-drop-over').forEach(zone => {
    zone.classList.remove('cm-drop-over');
  });
}

function onCardDragStart(event) {
  const card = event.currentTarget;
  draggedStudentId = card.dataset.studentId;

  card.classList.add('is-dragging');
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', draggedStudentId);
  }
}

function onCardDragEnd(event) {
  event.currentTarget.classList.remove('is-dragging');
  draggedStudentId = null;
  clearDropHighlights();
}

function moveStudentToZone(studentId, zoneType, groupIndex) {
  if (!studentId) return;

  removeStudentFromAllZones(studentId);

  if (
    zoneType === 'group' &&
    Number.isInteger(groupIndex) &&
    groupIndex >= 0 &&
    groupIndex < modalGroups.length
  ) {
    modalGroups[groupIndex].push(studentId);
  } else {
    modalUnassigned.push(studentId);
  }

  sanitizeModalZones();
}

function onDropZoneDragOver(event) {
  event.preventDefault();
  event.currentTarget.classList.add('cm-drop-over');
}

function onDropZoneDragLeave(event) {
  event.currentTarget.classList.remove('cm-drop-over');
}

function onDropZoneDrop(event) {
  event.preventDefault();

  const zone = event.currentTarget;
  const zoneType = zone.dataset.zoneType;
  const groupIndexRaw = parseInt(zone.dataset.groupIndex, 10);
  const groupIndex = Number.isFinite(groupIndexRaw) ? groupIndexRaw : null;

  const droppedId = draggedStudentId || event.dataTransfer?.getData('text/plain');
  moveStudentToZone(droppedId, zoneType, groupIndex);

  draggedStudentId = null;
  clearDropHighlights();
  renderModalEditor();
}

function bindDragAndDrop() {
  document.querySelectorAll('.cm-student-card').forEach(card => {
    card.addEventListener('dragstart', onCardDragStart);
    card.addEventListener('dragend', onCardDragEnd);
  });

  document.querySelectorAll('.cm-drop-zone').forEach(zone => {
    zone.addEventListener('dragover', onDropZoneDragOver);
    zone.addEventListener('dragleave', onDropZoneDragLeave);
    zone.addEventListener('drop', onDropZoneDrop);
  });
}

function renderModalEditor() {
  renderRosterSection();
  renderGroupSection();
  bindDragAndDrop();
}

function handleModalInput(event) {
  const target = event.target;
  const card = target.closest('.cm-student-card');

  if (target.classList.contains('cm-group-name-input')) {
    const groupIdx = parseInt(target.dataset.groupIndex, 10);
    if (Number.isFinite(groupIdx) && groupIdx >= 0 && groupIdx < modalGroupNames.length) {
      modalGroupNames[groupIdx] = target.value;
    }
    return;
  }

  if (!card) return;

  const studentId = card.dataset.studentId;
  const student = getStudentById(studentId);
  if (!student) return;

  if (target.classList.contains('cm-name-input')) {
    student.name = target.value;
    return;
  }

  if (target.classList.contains('cm-gender-select')) {
    student.gender = sanitizeGender(target.value);
  }
}

function handleModalClick(event) {
  const removeBtn = event.target.closest('.cm-remove-student-btn');
  if (!removeBtn) return;

  const studentId = removeBtn.dataset.studentId;
  if (!studentId) return;

  removeStudent(studentId);
}

function onGroupCountChange() {
  const groupCountInput = document.getElementById('class-group-count');
  if (!groupCountInput) return;

  const count = ensureModalGroupCount(groupCountInput.value);
  groupCountInput.value = count;

  renderModalEditor();
}

function parseCSV(content) {
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

// ===== Firestore 동기화 =====
async function syncClassToFirestore(classId) {
  const context = getGoogleSyncContext();
  if (!context) return;

  const { user, db } = context;
  const cls = Store.getClassById(classId);
  if (!cls) return;

  const classRef = db.collection('users').doc(user.uid).collection('classes').doc(classId);
  const userRef = db.collection('users').doc(user.uid);

  const normalizedStudents = (cls.students || [])
    .map((student, index) => {
      const name = normalizeStudentName(student);
      if (!name) return null;

      const numberRaw = typeof student === 'object' ? parseInt(student.number, 10) : NaN;

      return {
        name,
        number: Number.isFinite(numberRaw) && numberRaw > 0 ? numberRaw : index + 1,
        gender: typeof student === 'object' ? sanitizeGender(student.gender) : '',
        sportsAbility:
          typeof student === 'object' && typeof student.sportsAbility === 'string'
            ? student.sportsAbility
            : '',
        tags: typeof student === 'object' && Array.isArray(student.tags) ? student.tags : [],
        note: typeof student === 'object' && typeof student.note === 'string' ? student.note : '',
      };
    })
    .filter(Boolean)
    .sort(sortStudentsByNumber)
    .map((student, idx) => ({ ...student, number: idx + 1 }));

  const groups = normalizeGroupMembers(cls.groups || []);
  const groupsForFirestore = encodeGroupsForFirestore(groups);
  const groupCount = cls.groupCount || (groups.length > 0 ? groups.length : 6);
  const groupNames =
    Array.isArray(cls.groupNames) && cls.groupNames.length > 0
      ? cls.groupNames
      : Store.getDefaultGroupNames().slice(0, groupCount);

  const existingStudents = await classRef.collection('students').get();
  const batch = db.batch();

  batch.set(
    classRef,
    {
      name: cls.name,
      year: new Date().getFullYear(),
      grade: extractGradeFromClassName(cls.name),
      studentCount: normalizedStudents.length,
      groupNames,
      groups: groupsForFirestore,
      groupCount,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  existingStudents.forEach(doc => batch.delete(doc.ref));

  normalizedStudents.forEach(student => {
    const studentRef = classRef
      .collection('students')
      .doc(`student-${String(student.number).padStart(3, '0')}`);
    batch.set(studentRef, {
      name: student.name,
      number: student.number,
      gender: student.gender,
      sportsAbility: student.sportsAbility,
      tags: student.tags,
      note: student.note,
      groupIndex: getGroupIndexByStudentName(groups, student.name),
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
  });

  if (Store.getSelectedClassId() === classId) {
    batch.set(
      userRef,
      {
        selectedClassId: classId,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  }

  await batch.commit();
}

async function deleteClassFromFirestore(classId, selectedWasDeleted) {
  const context = getGoogleSyncContext();
  if (!context) return;

  const { user, db } = context;
  const userRef = db.collection('users').doc(user.uid);
  const classRef = userRef.collection('classes').doc(classId);

  const existingStudents = await classRef.collection('students').get();
  const batch = db.batch();

  existingStudents.forEach(doc => batch.delete(doc.ref));
  batch.delete(classRef);

  if (selectedWasDeleted) {
    batch.set(
      userRef,
      {
        selectedClassId: null,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  }

  await batch.commit();
}

// ===== 기본 공개 함수 =====
function init() {
  if (initialized) return;
  initialized = true;

  const closeBtn = document.getElementById('class-modal-close');
  const cancelBtn = document.getElementById('class-modal-cancel');
  const saveBtn = document.getElementById('class-modal-save');
  const csvBtn = document.getElementById('class-csv-import');
  const csvFile = document.getElementById('class-csv-file');
  const csvDownloadBtn = document.getElementById('class-csv-download');
  const googleSheetsBtn = document.getElementById('class-google-sheets-import');
  const openBulkModalBtn = document.getElementById('class-open-bulk-modal');
  const bulkModalCloseBtn = document.getElementById('class-bulk-modal-close');
  const bulkModalCancelBtn = document.getElementById('class-bulk-modal-cancel');
  const bulkModalApplyBtn = document.getElementById('class-bulk-modal-apply');
  const bulkRowAddBtn = document.getElementById('class-bulk-row-add');
  const bulkRowRemoveBtn = document.getElementById('class-bulk-row-remove');
  const addStudentBtn = document.getElementById('class-add-student-card');

  if (closeBtn) closeBtn.addEventListener('click', closeModal);
  if (cancelBtn) cancelBtn.addEventListener('click', closeModal);
  if (saveBtn) saveBtn.addEventListener('click', saveClass);
  if (csvBtn) csvBtn.addEventListener('click', () => csvFile?.click());
  if (csvFile) csvFile.addEventListener('change', handleCSVImport);
  if (csvDownloadBtn) csvDownloadBtn.addEventListener('click', downloadCSVTemplate);
  if (googleSheetsBtn) googleSheetsBtn.addEventListener('click', importFromGoogleSheets);
  if (openBulkModalBtn) openBulkModalBtn.addEventListener('click', openBulkRegistrationModal);
  if (bulkModalCloseBtn) bulkModalCloseBtn.addEventListener('click', closeBulkRegistrationModal);
  if (bulkModalCancelBtn) bulkModalCancelBtn.addEventListener('click', closeBulkRegistrationModal);
  if (bulkModalApplyBtn) bulkModalApplyBtn.addEventListener('click', applyBulkRegistrationModal);
  if (bulkRowAddBtn) bulkRowAddBtn.addEventListener('click', addBulkModalRow);
  if (bulkRowRemoveBtn) bulkRowRemoveBtn.addEventListener('click', removeBulkModalRow);
  if (addStudentBtn) addStudentBtn.addEventListener('click', addStudentCard);

  const groupCountInput = document.getElementById('class-group-count');
  if (groupCountInput) {
    groupCountInput.addEventListener('change', onGroupCountChange);
  }

  const modalEl = document.getElementById('class-modal');
  if (modalEl) {
    modalEl.addEventListener('input', handleModalInput);
    modalEl.addEventListener('change', handleModalInput);
    modalEl.addEventListener('click', handleModalClick);
  }

  const bulkModalEl = document.getElementById('class-bulk-modal');
  if (bulkModalEl) {
    bulkModalEl.addEventListener('input', handleBulkModalInput);
    bulkModalEl.addEventListener('change', handleBulkModalInput);
  }

  const saveDefaultBtn = document.getElementById('save-default-group-names');
  if (saveDefaultBtn) saveDefaultBtn.addEventListener('click', saveDefaultGroupNamesHandler);

  const addDefaultBtn = document.getElementById('default-group-add');
  if (addDefaultBtn) addDefaultBtn.addEventListener('click', addDefaultGroupName);

  const removeDefaultBtn = document.getElementById('default-group-remove');
  if (removeDefaultBtn) removeDefaultBtn.addEventListener('click', removeDefaultGroupName);

  const resetBtn = document.getElementById('settings-reset-data');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      if (confirm('모든 데이터를 초기화하시겠습니까?\n학급, 기록 등이 모두 삭제됩니다.')) {
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('pet_')) keysToRemove.push(key);
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));
        location.reload();
      }
    });
  }

  const editBtn = document.getElementById('settings-add-class');
  if (editBtn) {
    editBtn.addEventListener('click', () => {
      const cls = Store.getSelectedClass();
      if (!cls) return;

      openModal(cls.id, () => {
        onSettingsPageEnter();
        const nameEl = document.getElementById('navbar-class-name');
        const updatedCls = Store.getSelectedClass();
        if (nameEl && updatedCls) nameEl.textContent = updatedCls.name;
      });
    });
  }

  const landingAddBtn = document.getElementById('landing-add-class');
  if (landingAddBtn) {
    landingAddBtn.addEventListener('click', () => {
      openModal(null, () => {
        renderLandingClassList();
      });
    });
  }

  loadDefaultGroupNames();
}

function populateSelect(selectId, selectedId) {
  const select = document.getElementById(selectId);
  if (!select) return;

  const classes = Store.getClasses();
  const current = select.value;

  select.innerHTML = '<option value="">학급 선택...</option>';
  classes.forEach(cls => {
    const option = document.createElement('option');
    option.value = cls.id;
    option.textContent = `${cls.name} (${cls.students.length}명)`;
    select.appendChild(option);
  });

  if (selectedId) select.value = selectedId;
  else if (current) select.value = current;
}

function getStudentNames(classId) {
  const cls = Store.getClassById(classId);
  if (!cls || !Array.isArray(cls.students)) return [];

  return cls.students.map(student => normalizeStudentName(student)).filter(Boolean);
}

function openModal(classId, callback) {
  editingClassId = classId;
  onSaveCallback = callback || null;

  const titleEl = document.getElementById('class-modal-title');
  const nameInput = document.getElementById('class-name-input');
  const groupCountInput = document.getElementById('class-group-count');
  const legacyInput = document.getElementById('class-students-input');

  if (legacyInput) legacyInput.style.display = 'none';

  if (classId) {
    const cls = Store.getClassById(classId);
    if (cls) {
      titleEl.textContent = '학급 편집';
      nameInput.value = cls.name;

      const count = cls.groupCount || cls.groups?.length || 6;
      if (groupCountInput) groupCountInput.value = ensureModalGroupCount(count);

      initializeModalState(cls, count);
    }
  } else {
    titleEl.textContent = '새 학급 추가';
    nameInput.value = '';

    const count = ensureModalGroupCount(6);
    if (groupCountInput) groupCountInput.value = count;

    initializeModalState(null, count);
  }

  renderModalEditor();

  UI.showModal('class-modal');
}

function closeModal() {
  UI.hideModal('class-modal');

  editingClassId = null;
  draggedStudentId = null;
  closeBulkRegistrationModal();

  const csvFile = document.getElementById('class-csv-file');
  const saveBtn = document.getElementById('class-modal-save');

  if (csvFile) csvFile.value = '';
  if (saveBtn) saveBtn.disabled = false;

  modalStudents = [];
  modalUnassigned = [];
  modalGroups = [];
  modalGroupNames = [];
  bulkModalRows = [];

  const rosterEl = document.getElementById('class-student-roster');
  const boardEl = document.getElementById('class-group-assign-board');
  if (rosterEl) rosterEl.innerHTML = '';
  if (boardEl) boardEl.innerHTML = '';
}

async function saveClass() {
  const nameInput = document.getElementById('class-name-input');
  const className = nameInput?.value.trim();
  const saveBtn = document.getElementById('class-modal-save');
  const groupCountInput = document.getElementById('class-group-count');

  if (!className) {
    UI.showToast('학급 이름을 입력하세요', 'error');
    return;
  }

  const groupCount = ensureModalGroupCount(parseInt(groupCountInput?.value, 10) || 6);
  if (groupCountInput) groupCountInput.value = groupCount;

  sanitizeModalZones();

  const validStudents = modalStudents
    .map(student => ({
      ...student,
      name: (student.name || '').trim(),
      number: parseInt(student.number, 10),
      gender: sanitizeGender(student.gender),
    }))
    .filter(student => student.name.length > 0)
    .sort(sortStudentsByNumber)
    .map((student, idx) => ({
      ...student,
      number: idx + 1,
      sportsAbility: student.sportsAbility || '',
      tags: Array.isArray(student.tags) ? student.tags : [],
      note: student.note || '',
    }));

  if (validStudents.length === 0) {
    UI.showToast('학생을 한 명 이상 입력하세요', 'error');
    return;
  }

  const validIdSet = new Set(validStudents.map(student => student.id));
  const nameById = new Map(validStudents.map(student => [student.id, student.name]));

  const finalGroups = modalGroups.slice(0, groupCount).map(group =>
    group
      .filter(studentId => validIdSet.has(studentId))
      .map(studentId => nameById.get(studentId))
      .filter(Boolean)
  );

  const finalGroupNames = Array.from({ length: groupCount }, (_, idx) => {
    const raw = (modalGroupNames[idx] || '').trim();
    return raw || `${idx + 1}모둠`;
  });

  if (saveBtn) saveBtn.disabled = true;

  try {
    let targetClassId = editingClassId;

    if (editingClassId) {
      Store.updateClass(
        editingClassId,
        className,
        validStudents,
        finalGroupNames,
        finalGroups,
        groupCount
      );
      UI.showToast(`${className} 수정 완료`, 'success');
    } else {
      const created = Store.addClass(
        className,
        validStudents,
        finalGroupNames,
        finalGroups,
        groupCount
      );
      targetClassId = created?.id || null;
      UI.showToast(`${className} 추가 완료`, 'success');
    }

    if (targetClassId) {
      await syncClassToFirestore(targetClassId);
    }

    closeModal();
    if (onSaveCallback) onSaveCallback();
  } catch (error) {
    console.error('❌ 학급 저장 실패:', error);
    UI.showToast('저장 중 오류가 발생했습니다. 다시 시도해주세요.', 'error');
    if (saveBtn) saveBtn.disabled = false;
  }
}

function handleCSVImport(event) {
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

function downloadCSVTemplate() {
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

function importFromGoogleSheets() {
  const showGuide = confirm(
    '📊 구글 시트에서 명렬표 가져오기\n\n' + '✅ 확인: 가이드 보기\n' + '❌ 취소: URL 바로 입력'
  );

  if (showGuide) {
    alert(
      '📝 구글 시트 작성 가이드\n\n' +
        '1) 열 예시: 번호, 이름, 성별\n' +
        '2) 공유 설정: 링크가 있는 모든 사용자(뷰어)\n' +
        '3) 시트 URL을 복사해 다시 가져오기 버튼을 눌러주세요'
    );

    window.open('https://sheets.google.com/create', '_blank');
    UI.showToast('새 탭에서 구글 시트를 열었습니다', 'success');
    return;
  }

  const url = prompt(
    '구글 스프레드시트 URL을 입력하세요.\n\n' +
      '예시:\nhttps://docs.google.com/spreadsheets/d/1abc.../edit'
  );

  if (!url) return;

  const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
  if (!match) {
    UI.showToast('올바른 구글 시트 URL이 아닙니다', 'error');
    return;
  }

  const sheetId = match[1];
  const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;

  UI.showToast('구글 시트에서 데이터를 가져오는 중...', 'info');

  fetch(csvUrl, { mode: 'cors' })
    .then(response => {
      if (!response.ok) throw new Error('시트를 불러올 수 없습니다');
      return response.text();
    })
    .then(content => {
      const rows = parseCSV(content);
      if (rows.length === 0) {
        UI.showToast('학생을 찾을 수 없습니다', 'error');
        return;
      }

      const count = applyImportedStudents(rows);
      if (count > 0) UI.showToast(`${count}명 가져오기 완료`, 'success');
    })
    .catch(error => {
      console.error('구글 시트 가져오기 오류:', error);
      UI.showToast('구글 시트를 불러올 수 없습니다. 공개 설정을 확인하세요.', 'error');
    });
}

function refreshAllSelects() {
  populateSelect('gm-class-name-select');
}

function renderLandingClassList() {
  const container = document.getElementById('landing-class-list');
  if (!container) return;

  const classes = Store.getClasses();

  if (classes.length === 0) {
    container.innerHTML = `
        <div class="landing-empty">
          <div class="landing-empty-icon">📚</div>
          <div>등록된 학급이 없습니다</div>
          <div style="margin-top: var(--space-xs);">아래 버튼으로 첫 학급을 만들어보세요!</div>
        </div>
      `;
    return;
  }

  container.innerHTML = classes
    .map(cls => {
      const gc = cls.groupCount || cls.groups?.length || 6;
      return `
        <div class="landing-class-card" onclick="App.onClassSelected('${cls.id}')">
          <div class="landing-card-info">
            <div class="landing-card-name">${UI.escapeHtml(cls.name)}</div>
            <div class="landing-card-meta">
              <span>👤 ${cls.students.length}명</span>
              <span>👥 ${gc}모둠</span>
            </div>
          </div>
          <div class="landing-card-actions" onclick="event.stopPropagation();">
            <button class="btn btn-sm btn-secondary" onclick="ClassManager.openModal('${cls.id}', ClassManager.renderLandingClassList)">편집</button>
            <button class="btn btn-sm btn-danger" onclick="ClassManager.deleteLandingClass('${cls.id}')">삭제</button>
          </div>
        </div>
      `;
    })
    .join('');
}

async function deleteLandingClass(id) {
  const cls = Store.getClassById(id);
  if (!cls) return;
  if (!confirm(`"${cls.name}"을(를) 삭제하시겠습니까?`)) return;

  const selectedWasDeleted = Store.getSelectedClassId() === id;

  try {
    await deleteClassFromFirestore(id, selectedWasDeleted);
  } catch (error) {
    console.error('❌ Firestore 학급 삭제 실패:', error);
    UI.showToast('클라우드 삭제에 실패했습니다. 다시 시도해주세요.', 'error');
    return;
  }

  if (selectedWasDeleted) {
    Store.clearSelectedClass();
  }

  Store.deleteClass(id);
  UI.showToast('학급 삭제 완료', 'success');
  renderLandingClassList();
}

function onSettingsPageEnter() {
  const cls = Store.getSelectedClass();

  const infoContainer = document.getElementById('settings-current-class');
  if (infoContainer && cls) {
    const gc = cls.groupCount || cls.groups?.length || 6;
    infoContainer.innerHTML = `
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--space-lg); text-align: center;">
          <div>
            <div style="font-size: var(--font-size-sm); color: var(--text-tertiary); margin-bottom: var(--space-xs);">학급명</div>
            <div style="font-size: var(--font-size-2xl); font-weight: 700; color: var(--text-primary);">${UI.escapeHtml(cls.name)}</div>
          </div>
          <div>
            <div style="font-size: var(--font-size-sm); color: var(--text-tertiary); margin-bottom: var(--space-xs);">학생 수</div>
            <div style="font-size: var(--font-size-2xl); font-weight: 700; color: var(--color-primary);">👤 ${cls.students.length}명</div>
          </div>
          <div>
            <div style="font-size: var(--font-size-sm); color: var(--text-tertiary); margin-bottom: var(--space-xs);">모둠 수</div>
            <div style="font-size: var(--font-size-2xl); font-weight: 700; color: var(--color-secondary);">👥 ${gc}모둠</div>
          </div>
        </div>
      `;
  }

  renderSettingsStudentList();
  loadDefaultGroupNames();
}

function renderSettingsStudentList() {
  const container = document.getElementById('settings-class-list');
  if (!container) return;

  const cls = Store.getSelectedClass();
  if (!cls) {
    container.innerHTML =
      '<div style="text-align: center; color: var(--text-tertiary); padding: var(--space-lg); font-size: var(--font-size-sm);">학급 정보가 없습니다</div>';
    return;
  }

  const gc = cls.groupCount || cls.groups?.length || 6;

  const minRows = 6;
  let maxMembers = minRows;
  for (let i = 0; i < gc; i++) {
    const len = cls.groups && cls.groups[i] ? cls.groups[i].length : 0;
    if (len > maxMembers) maxMembers = len;
  }

  let headerCells = '';
  for (let i = 0; i < gc; i++) {
    const groupName = (cls.groupNames && cls.groupNames[i]) || `${i + 1}모둠`;
    headerCells += `<th>${UI.escapeHtml(groupName)}</th>`;
  }

  let bodyRows = '';
  for (let row = 0; row < maxMembers; row++) {
    let cells = '';
    for (let col = 0; col < gc; col++) {
      const members = (cls.groups && cls.groups[col]) || [];
      const member = members[row];
      if (member) {
        const name = typeof member === 'string' ? member : member.name;
        if (row === 0) {
          cells += `<td class="leader-cell"><span class="leader-badge">⭐</span>${UI.escapeHtml(name)}</td>`;
        } else {
          cells += `<td>${UI.escapeHtml(name)}</td>`;
        }
      } else {
        cells += '<td></td>';
      }
    }
    bodyRows += `<tr>${cells}</tr>`;
  }

  container.innerHTML = `
      <div class="timetable-scroll">
        <table class="timetable settings-timetable">
          <thead><tr>${headerCells}</tr></thead>
          <tbody>${bodyRows}</tbody>
        </table>
      </div>
    `;
}

async function deleteClass(id) {
  const cls = Store.getClassById(id);
  if (!cls) return;
  if (!confirm(`"${cls.name}"을(를) 삭제하시겠습니까?`)) return;

  const selectedWasDeleted = Store.getSelectedClassId() === id;

  try {
    await deleteClassFromFirestore(id, selectedWasDeleted);
  } catch (error) {
    console.error('❌ Firestore 학급 삭제 실패:', error);
    UI.showToast('클라우드 삭제에 실패했습니다. 다시 시도해주세요.', 'error');
    return;
  }

  if (selectedWasDeleted) {
    Store.clearSelectedClass();
  }

  Store.deleteClass(id);
  UI.showToast('학급 삭제 완료', 'success');
  renderLandingClassList();
  refreshAllSelects();
}

// ===== 기본 모둠 이름 =====
function loadDefaultGroupNames() {
  const container = document.getElementById('default-group-names-list');
  if (!container) return;

  const names = Store.getDefaultGroupNames();
  container.innerHTML = '';

  names.forEach((name, index) => {
    createPillInput(container, name, index);
  });
}

function createPillInput(container, value, index) {
  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'pill-input';
  input.maxLength = 10;
  input.placeholder = `${index + 1}모둠`;
  input.value = value || '';
  input.dataset.idx = index;
  input.addEventListener('click', () => {
    input.classList.toggle('selected');
  });
  container.appendChild(input);
}

function addDefaultGroupName() {
  const container = document.getElementById('default-group-names-list');
  if (!container) return;

  const current = container.querySelectorAll('.pill-input').length;
  if (current >= 8) {
    UI.showToast('최대 8개까지 추가할 수 있습니다', 'error');
    return;
  }

  createPillInput(container, '', current);
  container.lastElementChild?.focus();
}

function removeDefaultGroupName() {
  const container = document.getElementById('default-group-names-list');
  if (!container) return;

  const selected = container.querySelectorAll('.pill-input.selected');
  if (selected.length === 0) {
    UI.showToast('삭제할 모둠을 먼저 선택하세요', 'info');
    return;
  }

  const total = container.querySelectorAll('.pill-input').length;
  if (total - selected.length < 2) {
    UI.showToast('최소 2개는 유지해야 합니다', 'error');
    return;
  }

  selected.forEach(el => el.remove());
}

function saveDefaultGroupNamesHandler() {
  const container = document.getElementById('default-group-names-list');
  if (!container) return;

  const inputs = container.querySelectorAll('.pill-input');
  const names = [];

  inputs.forEach((input, index) => {
    const value = input.value.trim();
    names.push(value || `${index + 1}모둠`);
  });

  if (names.length === 0) {
    UI.showToast('최소 1개 이상의 모둠 이름을 입력하세요', 'error');
    return;
  }

  Store.saveDefaultGroupNames(names);
  UI.showToast('기본 모둠 이름 저장 완료', 'success');
}

export const ClassManager = {
  init,
  populateSelect,
  getStudentNames,
  openModal,
  closeModal,
  refreshAllSelects,
  renderLandingClassList,
  deleteLandingClass,
  deleteClass,
  onSettingsPageEnter,
  renderSettingsStudentList,
  downloadCSVTemplate,
  importFromGoogleSheets,
};
