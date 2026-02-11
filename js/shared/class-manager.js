/* ============================================
   PE Picker - Class Manager (학급/학생 관리)
   두 기능(술래뽑기, 모둠뽑기)에서 공유
   ============================================ */

const ClassManager = (() => {
  let editingClassId = null;
  let onSaveCallback = null;

  function init() {
    // 모달 버튼 바인딩
    const closeBtn = document.getElementById('class-modal-close');
    const cancelBtn = document.getElementById('class-modal-cancel');
    const saveBtn = document.getElementById('class-modal-save');
    const csvBtn = document.getElementById('class-csv-import');
    const csvFile = document.getElementById('class-csv-file');

    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (cancelBtn) cancelBtn.addEventListener('click', closeModal);
    if (saveBtn) saveBtn.addEventListener('click', saveClass);
    if (csvBtn) csvBtn.addEventListener('click', () => csvFile?.click());
    if (csvFile) csvFile.addEventListener('change', handleCSVImport);

    // 설정 페이지: 학급 목록 렌더
    renderSettingsClassList();
    loadDefaultGroupNames();

    // 설정: 새 학급 추가 버튼
    const addBtn = document.getElementById('settings-add-class');
    if (addBtn) addBtn.addEventListener('click', () => openModal(null, renderSettingsClassList));

    // 설정: 기본 모둠 이름 저장 버튼
    const saveDefaultBtn = document.getElementById('save-default-group-names');
    if (saveDefaultBtn) saveDefaultBtn.addEventListener('click', saveDefaultGroupNamesHandler);

    // 설정: 데이터 초기화
    const resetBtn = document.getElementById('settings-reset-data');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        if (confirm('모든 데이터를 초기화하시겠습니까?\n학급, 기록 등이 모두 삭제됩니다.')) {
          localStorage.clear();
          location.reload();
        }
      });
    }
  }

  // === Select 옵션 채우기 ===
  function populateSelect(selectId, selectedId) {
    const select = document.getElementById(selectId);
    if (!select) return;

    const classes = Store.getClasses();
    const current = select.value;

    select.innerHTML = '<option value="">학급 선택...</option>';
    classes.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.id;
      opt.textContent = `${c.name} (${c.students.length}명)`;
      select.appendChild(opt);
    });

    // 선택 복원
    if (selectedId) select.value = selectedId;
    else if (current) select.value = current;
  }

  // === 학급의 학생 이름 배열 가져오기 ===
  function getStudentNames(classId) {
    const cls = Store.getClassById(classId);
    if (!cls) return [];
    return cls.students.map(s => typeof s === 'string' ? s : s.name);
  }

  // === 모달 열기 ===
  function openModal(classId, callback) {
    editingClassId = classId;
    onSaveCallback = callback || null;

    const titleEl = document.getElementById('class-modal-title');
    const nameInput = document.getElementById('class-name-input');
    const studentsInput = document.getElementById('class-students-input');

    // 모둠 이름 섹션
    const groupNameSection = document.getElementById('class-group-names-section');
    const groupNameInputs = [];
    for (let i = 1; i <= 6; i++) {
      groupNameInputs.push(document.getElementById(`class-group-name-${i}`));
    }

    if (classId) {
      // 편집 모드
      const cls = Store.getClassById(classId);
      if (cls) {
        titleEl.textContent = '학급 편집';
        nameInput.value = cls.name;
        studentsInput.value = getStudentNames(classId).join('\n');

        // 모둠 이름 섹션 표시
        if (groupNameSection) groupNameSection.style.display = '';

        // 모둠 이름 채우기
        const groupNames = cls.groupNames || Store.getDefaultGroupNames();
        groupNameInputs.forEach((input, idx) => {
          if (input) input.value = groupNames[idx] || '';
        });
      }
    } else {
      // 새 학급 추가 모드
      titleEl.textContent = '새 학급 추가';
      nameInput.value = '';
      studentsInput.value = '';

      // 모둠 이름 섹션 숨기기
      if (groupNameSection) groupNameSection.style.display = 'none';
    }

    UI.showModal('class-modal');
  }

  function closeModal() {
    UI.hideModal('class-modal');
    editingClassId = null;
    // 파일 입력 초기화
    const csvFile = document.getElementById('class-csv-file');
    if (csvFile) csvFile.value = '';
  }

  // === 학급 저장 ===
  function saveClass() {
    const nameInput = document.getElementById('class-name-input');
    const studentsInput = document.getElementById('class-students-input');

    const name = nameInput.value.trim();
    const students = studentsInput.value
      .split('\n')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    if (!name) {
      UI.showToast('학급 이름을 입력하세요', 'error');
      return;
    }
    if (students.length === 0) {
      UI.showToast('학생을 한 명 이상 입력하세요', 'error');
      return;
    }

    if (editingClassId) {
      // 편집 모드: 모둠 이름 수집
      const groupNames = [];
      for (let i = 1; i <= 6; i++) {
        const input = document.getElementById(`class-group-name-${i}`);
        if (input && input.value.trim()) {
          groupNames.push(input.value.trim());
        }
      }
      // 모둠 이름이 없으면 기본값 사용
      const finalGroupNames = groupNames.length > 0 ? groupNames : Store.getDefaultGroupNames();
      Store.updateClass(editingClassId, name, students, finalGroupNames);
      UI.showToast(`${name} 수정 완료`, 'success');
    } else {
      // 새 학급: 기본 모둠 이름 사용
      Store.addClass(name, students, Store.getDefaultGroupNames());
      UI.showToast(`${name} 추가 완료`, 'success');
    }

    closeModal();

    // 콜백 호출 (선택 목록 갱신 등)
    if (onSaveCallback) onSaveCallback();

    // 모든 select 갱신
    refreshAllSelects();

    // 설정 학급 목록 갱신
    renderSettingsClassList();
  }

  // === CSV 가져오기 ===
  function handleCSVImport(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target.result;
      const students = parseCSV(content);

      if (students.length === 0) {
        UI.showToast('학생을 찾을 수 없습니다', 'error');
        return;
      }

      const studentsInput = document.getElementById('class-students-input');
      if (studentsInput) {
        studentsInput.value = students.join('\n');
      }
      UI.showToast(`${students.length}명 가져오기 완료`, 'success');
    };
    reader.readAsText(file, 'UTF-8');
  }

  function parseCSV(content) {
    const lines = content.split('\n').map(l => l.trim()).filter(l => l);
    if (lines.length === 0) return [];

    // 헤더 감지
    const headerKeywords = ['이름', '성명', 'name', '학생'];
    const firstLine = lines[0].toLowerCase();
    const hasHeader = headerKeywords.some(k => firstLine.includes(k));

    // 구분자 감지
    const delimiter = lines[0].includes('\t') ? '\t' : ',';

    const startIdx = hasHeader ? 1 : 0;
    let nameColIdx = 0;

    if (hasHeader) {
      const headers = lines[0].split(delimiter).map(h => h.trim().toLowerCase());
      const nameIdx = headers.findIndex(h =>
        headerKeywords.some(k => h.includes(k))
      );
      if (nameIdx !== -1) nameColIdx = nameIdx;
    }

    const students = [];
    for (let i = startIdx; i < lines.length; i++) {
      const cols = lines[i].split(delimiter).map(c => c.trim());
      const name = cols[nameColIdx] || '';
      if (name && !/^\d+$/.test(name) && name.length <= 20) {
        students.push(name);
      }
    }
    return students;
  }

  // === 모든 Select 갱신 ===
  function refreshAllSelects() {
    populateSelect('tag-class-select');
    populateSelect('gm-class-select');
  }

  // === 설정 페이지: 학급 목록 ===
  function renderSettingsClassList() {
    const container = document.getElementById('settings-class-list');
    if (!container) return;

    const classes = Store.getClasses();
    if (classes.length === 0) {
      container.innerHTML = `<div style="text-align: center; color: var(--text-tertiary); padding: var(--space-lg); font-size: var(--font-size-sm);">등록된 학급이 없습니다</div>`;
      return;
    }

    container.innerHTML = classes.map(c => `
      <div class="settings-class-item" style="display: flex; align-items: center; justify-content: space-between; padding: var(--space-md) 0; border-bottom: 1px solid rgba(124,158,245,0.08);">
        <div>
          <div style="font-weight: 600; font-size: var(--font-size-sm);">${c.name}</div>
          <div style="font-size: var(--font-size-xs); color: var(--text-tertiary);">${c.students.length}명</div>
        </div>
        <div style="display: flex; gap: var(--space-sm);">
          <button class="btn btn-sm btn-secondary" onclick="ClassManager.openModal('${c.id}', ClassManager.renderSettingsClassList)">편집</button>
          <button class="btn btn-sm btn-danger" onclick="ClassManager.deleteClass('${c.id}')">삭제</button>
        </div>
      </div>
    `).join('');
  }

  // === 학급 삭제 ===
  function deleteClass(id) {
    const cls = Store.getClassById(id);
    if (!cls) return;
    if (!confirm(`"${cls.name}"을(를) 삭제하시겠습니까?`)) return;
    Store.deleteClass(id);
    UI.showToast('학급 삭제 완료', 'success');
    renderSettingsClassList();
    refreshAllSelects();
  }

  // === 기본 모둠 이름 관리 ===
  function loadDefaultGroupNames() {
    const defaultNames = Store.getDefaultGroupNames();
    for (let i = 1; i <= 6; i++) {
      const input = document.getElementById(`default-group-name-${i}`);
      if (input) {
        input.value = defaultNames[i - 1] || '';
      }
    }
  }

  function saveDefaultGroupNamesHandler() {
    const names = [];
    for (let i = 1; i <= 6; i++) {
      const input = document.getElementById(`default-group-name-${i}`);
      if (input && input.value.trim()) {
        names.push(input.value.trim());
      }
    }

    if (names.length === 0) {
      UI.showToast('최소 1개 이상의 모둠 이름을 입력하세요', 'error');
      return;
    }

    Store.saveDefaultGroupNames(names);
    UI.showToast('기본 모둠 이름 저장 완료', 'success');
  }

  return {
    init,
    populateSelect,
    getStudentNames,
    openModal,
    closeModal,
    refreshAllSelects,
    renderSettingsClassList,
    deleteClass,
  };
})();
