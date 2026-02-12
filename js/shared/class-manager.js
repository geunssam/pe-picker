/* ============================================
   PE Picker - Class Manager (학급/학생 관리)
   두 기능(술래뽑기, 모둠뽑기)에서 공유
   v2: 랜딩 페이지 + 동적 모둠 수(2~8)
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
    const csvDownloadBtn = document.getElementById('class-csv-download');
    const googleSheetsBtn = document.getElementById('class-google-sheets-import');

    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (cancelBtn) cancelBtn.addEventListener('click', closeModal);
    if (saveBtn) saveBtn.addEventListener('click', saveClass);
    if (csvBtn) csvBtn.addEventListener('click', () => csvFile?.click());
    if (csvFile) csvFile.addEventListener('change', handleCSVImport);
    if (csvDownloadBtn) csvDownloadBtn.addEventListener('click', downloadCSVTemplate);
    if (googleSheetsBtn) googleSheetsBtn.addEventListener('click', importFromGoogleSheets);

    // 모둠 수 스테퍼 변경 이벤트
    const groupCountInput = document.getElementById('class-group-count');
    if (groupCountInput) {
      groupCountInput.addEventListener('change', onGroupCountChange);
    }

    // 설정: 기본 모둠 이름 버튼들
    const saveDefaultBtn = document.getElementById('save-default-group-names');
    if (saveDefaultBtn) saveDefaultBtn.addEventListener('click', saveDefaultGroupNamesHandler);

    const addDefaultBtn = document.getElementById('default-group-add');
    if (addDefaultBtn) addDefaultBtn.addEventListener('click', addDefaultGroupName);

    const removeDefaultBtn = document.getElementById('default-group-remove');
    if (removeDefaultBtn) removeDefaultBtn.addEventListener('click', removeDefaultGroupName);

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

    // 설정: 편집 버튼
    const editBtn = document.getElementById('settings-add-class');
    if (editBtn) {
      editBtn.addEventListener('click', () => {
        const cls = Store.getSelectedClass();
        if (cls) {
          openModal(cls.id, () => {
            onSettingsPageEnter();
            // 네비바 학급명 갱신
            const nameEl = document.getElementById('navbar-class-name');
            const updatedCls = Store.getSelectedClass();
            if (nameEl && updatedCls) nameEl.textContent = updatedCls.name;
          });
        }
      });
    }

    // 랜딩: 새 학급 만들기 버튼
    const landingAddBtn = document.getElementById('landing-add-class');
    if (landingAddBtn) {
      landingAddBtn.addEventListener('click', () => {
        openModal(null, () => {
          renderLandingClassList();
        });
      });
    }

    // 초기 기본 모둠 이름 로딩
    loadDefaultGroupNames();
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
    const groupCountInput = document.getElementById('class-group-count');

    // 기존 단일 명단 입력 필드는 숨김 (호환성 유지)
    const legacyInput = document.getElementById('class-students-input');
    if (legacyInput) legacyInput.style.display = 'none';

    if (classId) {
      // 편집 모드
      const cls = Store.getClassById(classId);
      if (cls) {
        titleEl.textContent = '학급 편집';
        nameInput.value = cls.name;
        const gc = cls.groupCount || cls.groups?.length || 6;
        if (groupCountInput) groupCountInput.value = gc;
        renderGroupGrid(cls);
      }
    } else {
      // 새 학급 추가 모드
      titleEl.textContent = '새 학급 추가';
      nameInput.value = '';
      if (groupCountInput) groupCountInput.value = 6;
      renderGroupGrid(null);
    }

    UI.showModal('class-modal');
  }

  function closeModal() {
    UI.hideModal('class-modal');
    editingClassId = null;
    const csvFile = document.getElementById('class-csv-file');
    if (csvFile) csvFile.value = '';
    // 그리드 초기화
    const grid = document.getElementById('class-group-grid');
    if (grid) grid.innerHTML = '';
  }

  // === 모둠 수 변경 핸들러 ===
  function onGroupCountChange() {
    // 현재 그리드 데이터 수집
    const currentData = collectGridData();
    // 새 모둠 수로 그리드 재렌더링
    renderGroupGridFromData(currentData);
  }

  function collectGridData() {
    const nameInputs = document.querySelectorAll('.group-name-input');
    const studentInputs = document.querySelectorAll('.group-student-input');

    // 모둠 수 파악
    const groupCount = nameInputs.length;
    const data = [];

    for (let i = 0; i < groupCount; i++) {
      // 각 모둠의 학생들 수집
      const groupStudents = Array.from(studentInputs)
        .filter(input => parseInt(input.dataset.group) === i)
        .map(input => input.value.trim())
        .filter(name => name.length > 0);

      data.push({
        name: nameInputs[i]?.value || '',
        students: groupStudents.join('\n'), // 줄바꿈으로 조인 (기존 포맷 유지)
      });
    }
    return data;
  }

  // === 시간표 테이블 생성 (기존 데이터에서) ===
  function renderGroupGridFromData(existingData) {
    const table = document.getElementById('class-group-grid');
    if (!table) return;

    const groupCountInput = document.getElementById('class-group-count');
    const groupCount = parseInt(groupCountInput?.value) || 6;
    const defaultNames = Store.getDefaultGroupNames();

    // 각 모둠의 학생 배열 파싱
    const groupStudents = [];
    for (let i = 0; i < groupCount; i++) {
      const existing = existingData[i] || {};
      const memberText = existing.students || '';
      const students = memberText.split('\n').map(s => s.trim()).filter(s => s.length > 0);
      groupStudents.push(students);
    }

    // 최대 행 수 결정 (기본 6행, 학생 수에 따라 확장)
    let maxRows = 6;
    groupStudents.forEach(students => {
      if (students.length > maxRows) maxRows = students.length;
    });

    // 헤더 행 (모둠명)
    let headerCells = '';
    for (let i = 0; i < groupCount; i++) {
      const existing = existingData[i] || {};
      const groupName = existing.name || defaultNames[i] || `${i + 1}모둠`;
      headerCells += `<th><input type="text" class="group-name-input" data-idx="${i}" value="${groupName}" placeholder="${i + 1}모둠"></th>`;
    }

    // 학생 행 (각 셀마다 input)
    let bodyRows = '';
    for (let row = 0; row < maxRows; row++) {
      let cells = '';
      for (let col = 0; col < groupCount; col++) {
        const studentName = groupStudents[col][row] || '';
        cells += `<td><input type="text" class="group-student-input" data-group="${col}" data-row="${row}" value="${studentName}" placeholder="이름"></td>`;
      }
      bodyRows += `<tr>${cells}</tr>`;
    }

    table.innerHTML = `
      <thead><tr>${headerCells}</tr></thead>
      <tbody>${bodyRows}</tbody>
    `;
  }

  // === 시간표 테이블 생성 (학급 객체에서) - 엑셀 스타일 ===
  function renderGroupGrid(cls) {
    const table = document.getElementById('class-group-grid');
    if (!table) return;

    const groupCountInput = document.getElementById('class-group-count');
    const groupCount = parseInt(groupCountInput?.value) || (cls?.groupCount) || 6;
    const defaultNames = Store.getDefaultGroupNames();

    // 기존 데이터 → 모둠별 분배
    let groupMembers = Array.from({ length: groupCount }, () => []);

    if (cls) {
      if (cls.groups && cls.groups.length > 0) {
        groupMembers = Array.from({ length: groupCount }, (_, i) => cls.groups[i] || []);
      } else if (cls.students && cls.students.length > 0) {
        cls.students.forEach((s, idx) => {
          groupMembers[idx % groupCount].push(s);
        });
      }
    }

    const currentGroupNames = (cls && cls.groupNames && cls.groupNames.length > 0)
      ? cls.groupNames
      : defaultNames;

    // 최대 행 수 결정 (기본 6행, 학생 수에 따라 확장)
    let maxRows = 6;
    groupMembers.forEach(members => {
      if (members.length > maxRows) maxRows = members.length;
    });

    // 헤더 행 (모둠명)
    let headerCells = '';
    for (let i = 0; i < groupCount; i++) {
      const groupName = currentGroupNames[i] || defaultNames[i] || `${i + 1}모둠`;
      headerCells += `<th><input type="text" class="group-name-input" data-idx="${i}" value="${groupName}" placeholder="${i + 1}모둠"></th>`;
    }

    // 학생 행 (각 셀마다 input)
    let bodyRows = '';
    for (let row = 0; row < maxRows; row++) {
      let cells = '';
      for (let col = 0; col < groupCount; col++) {
        const members = groupMembers[col] || [];
        const member = members[row];
        const studentName = member ? (typeof member === 'string' ? member : member.name) : '';
        cells += `<td><input type="text" class="group-student-input" data-group="${col}" data-row="${row}" value="${studentName}" placeholder="이름"></td>`;
      }
      bodyRows += `<tr>${cells}</tr>`;
    }

    table.innerHTML = `
      <thead><tr>${headerCells}</tr></thead>
      <tbody>${bodyRows}</tbody>
    `;
  }

  // === 학급 저장 (엑셀 스타일) ===
  function saveClass() {
    const nameInput = document.getElementById('class-name-input');
    const className = nameInput.value.trim();

    if (!className) {
      UI.showToast('학급 이름을 입력하세요', 'error');
      return;
    }

    const groupCountInput = document.getElementById('class-group-count');
    const groupCount = parseInt(groupCountInput?.value) || 6;
    const studentInputs = document.querySelectorAll('.group-student-input');
    const nameInputs = document.querySelectorAll('.group-name-input');

    const finalGroupNames = [];
    const finalGroups = []; // [[s1, s2], ...]
    let allStudents = [];

    for (let i = 0; i < groupCount; i++) {
      // 모둠 이름
      const gName = nameInputs[i]?.value?.trim() || `${i + 1}모둠`;
      finalGroupNames.push(gName);

      // 모둠원 (각 셀에서 수집)
      const members = Array.from(studentInputs)
        .filter(input => parseInt(input.dataset.group) === i)
        .map(input => input.value.trim())
        .filter(name => name.length > 0);

      finalGroups.push(members);
      allStudents = allStudents.concat(members);
    }

    if (allStudents.length === 0) {
      UI.showToast('학생을 한 명 이상 입력하세요', 'error');
      return;
    }

    if (editingClassId) {
      Store.updateClass(editingClassId, className, allStudents, finalGroupNames, finalGroups, groupCount);
      UI.showToast(`${className} 수정 완료`, 'success');
    } else {
      Store.addClass(className, allStudents, finalGroupNames, finalGroups, groupCount);
      UI.showToast(`${className} 추가 완료`, 'success');
    }

    closeModal();
    if (onSaveCallback) onSaveCallback();
  }

  // === CSV 가져오기 (순차 분배) - 엑셀 스타일 ===
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

      // 현재 모둠 수에 따라 분배
      const groupCountInput = document.getElementById('class-group-count');
      const groupCount = parseInt(groupCountInput?.value) || 6;

      const inputs = document.querySelectorAll('.group-student-input');
      students.forEach((studentName, idx) => {
        const groupIdx = idx % groupCount;
        const rowIdx = Math.floor(idx / groupCount);

        // 해당 그룹과 행의 input 찾기
        const targetInput = Array.from(inputs).find(input =>
          parseInt(input.dataset.group) === groupIdx && parseInt(input.dataset.row) === rowIdx
        );

        if (targetInput) {
          targetInput.value = studentName;
        }
      });

      UI.showToast(`${students.length}명 가져오기 완료 (자동 분배됨)`, 'success');
    };
    reader.readAsText(file, 'UTF-8');
  }

  function parseCSV(content) {
    const lines = content.split('\n').map(l => l.trim()).filter(l => l);
    if (lines.length === 0) return [];

    // 헤더 감지
    const headerKeywords = ['이름', '성명', 'name', '학생', '모둠'];
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

  // === CSV 템플릿 다운로드 ===
  function downloadCSVTemplate() {
    const groupCountInput = document.getElementById('class-group-count');
    const groupCount = parseInt(groupCountInput?.value) || 6;
    const defaultNames = Store.getDefaultGroupNames();
    const rowCount = 6; // 기본 6행

    // CSV 생성 (UTF-8 BOM 추가로 엑셀 한글 깨짐 방지)
    let csvContent = '\uFEFF'; // UTF-8 BOM

    // 헤더 (모둠 이름)
    const headers = [];
    for (let i = 0; i < groupCount; i++) {
      const groupName = defaultNames[i] || `${i + 1}모둠`;
      headers.push(groupName);
    }
    csvContent += headers.join(',') + '\n';

    // 빈 행들 (6행)
    for (let r = 0; r < rowCount; r++) {
      const row = new Array(groupCount).fill('');
      csvContent += row.join(',') + '\n';
    }

    // Blob 생성 및 다운로드
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = '학급_명단_템플릿.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);

    UI.showToast('템플릿 다운로드 완료! CSV 파일을 열어서 학생 이름을 입력하세요.', 'success');
  }

  // === 구글 시트에서 가져오기 ===
  function importFromGoogleSheets() {
    // 사용 가이드 표시
    const showGuide = confirm(
      '📊 구글 시트로 학생 명단 가져오기\n\n' +
      '구글 시트가 이미 있으신가요?\n\n' +
      '✅ "확인" - 사용 방법 보기 & 새 시트 만들기\n' +
      '❌ "취소" - 기존 시트 URL 바로 입력'
    );

    if (showGuide) {
      // 먼저 가이드 표시
      alert(
        '📝 구글 시트 작성 가이드\n\n' +
        '━━━━━━━━━━━━━━━━━━━━\n' +
        '1️⃣ 학생 이름 입력 형식\n' +
        '━━━━━━━━━━━━━━━━━━━━\n' +
        '• 1행: 모둠명 (1모둠, 2모둠, ...)\n' +
        '• 2행부터: 학생 이름 (세로로)\n\n' +
        '예시:\n' +
        '┌────────┬────────┬────────┐\n' +
        '│ 1모둠  │ 2모둠  │ 3모둠  │\n' +
        '│ 김철수 │ 이영희 │ 박민수 │\n' +
        '│ 홍길동 │ 신사임당│ 세종  │\n' +
        '│ 장영실 │ 허준   │ 정약용 │\n' +
        '└────────┴────────┴────────┘\n\n' +
        '━━━━━━━━━━━━━━━━━━━━\n' +
        '2️⃣ 공개 설정 (필수!)\n' +
        '━━━━━━━━━━━━━━━━━━━━\n' +
        '① 우측 상단 "공유" 클릭\n' +
        '② "일반 액세스" 클릭\n' +
        '③ "링크가 있는 모든 사용자" 선택\n' +
        '④ 역할: "뷰어" 선택\n' +
        '⑤ "링크 복사" 클릭\n\n' +
        '━━━━━━━━━━━━━━━━━━━━\n' +
        '3️⃣ 가져오기\n' +
        '━━━━━━━━━━━━━━━━━━━━\n' +
        '• 이 버튼을 다시 클릭\n' +
        '• 복사한 URL 붙여넣기\n\n' +
        '확인을 누르면 새 탭에서 구글 시트가 열립니다!'
      );

      // 가이드 확인 후 새 탭으로 구글 시트 열기
      window.open('https://sheets.google.com/create', '_blank');

      // 완료 안내
      UI.showToast('새 탭에서 구글 시트가 열렸습니다! 가이드대로 작성 후 다시 이 버튼을 클릭하세요.', 'success');
      return;
    }

    // URL 입력 프롬프트
    const message =
      '구글 스프레드시트 URL을 입력하세요.\n\n' +
      '⚠️ 시트가 공개되어 있어야 합니다!\n' +
      '(공유 > 일반 액세스 > "링크가 있는 모든 사용자")\n\n' +
      '예시:\n' +
      'https://docs.google.com/spreadsheets/d/1abc.../edit';

    const url = prompt(message);
    if (!url) return;

    // URL에서 시트 ID 추출
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
        if (!response.ok) {
          throw new Error('시트를 불러올 수 없습니다');
        }
        return response.text();
      })
      .then(content => {
        const students = parseCSV(content);

        if (students.length === 0) {
          UI.showToast('학생을 찾을 수 없습니다', 'error');
          return;
        }

        // 현재 모둠 수에 따라 분배
        const groupCountInput = document.getElementById('class-group-count');
        const groupCount = parseInt(groupCountInput?.value) || 6;

        const inputs = document.querySelectorAll('.group-student-input');
        students.forEach((studentName, idx) => {
          const groupIdx = idx % groupCount;
          const rowIdx = Math.floor(idx / groupCount);

          // 해당 그룹과 행의 input 찾기
          const targetInput = Array.from(inputs).find(input =>
            parseInt(input.dataset.group) === groupIdx && parseInt(input.dataset.row) === rowIdx
          );

          if (targetInput) {
            targetInput.value = studentName;
          }
        });

        UI.showToast(`${students.length}명 가져오기 완료!`, 'success');
      })
      .catch(error => {
        console.error('구글 시트 가져오기 오류:', error);
        UI.showToast('구글 시트를 불러올 수 없습니다.\n\n시트가 공개되어 있는지 확인하세요:\n1. 파일 > 공유 > 일반 액세스를 "링크가 있는 모든 사용자"로 변경\n2. 다시 시도해주세요', 'error');
      });
  }

  // === 모든 Select 갱신 ===
  function refreshAllSelects() {
    populateSelect('gm-class-name-select');
  }

  // === 랜딩 페이지: 학급 카드 목록 ===
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

    container.innerHTML = classes.map(c => {
      const gc = c.groupCount || c.groups?.length || 6;
      return `
        <div class="landing-class-card" onclick="App.onClassSelected('${c.id}')">
          <div class="landing-card-info">
            <div class="landing-card-name">${c.name}</div>
            <div class="landing-card-meta">
              <span>👤 ${c.students.length}명</span>
              <span>👥 ${gc}모둠</span>
            </div>
          </div>
          <div class="landing-card-actions" onclick="event.stopPropagation();">
            <button class="btn btn-sm btn-secondary" onclick="ClassManager.openModal('${c.id}', ClassManager.renderLandingClassList)">편집</button>
            <button class="btn btn-sm btn-danger" onclick="ClassManager.deleteLandingClass('${c.id}')">삭제</button>
          </div>
        </div>
      `;
    }).join('');
  }

  // === 랜딩에서 학급 삭제 ===
  function deleteLandingClass(id) {
    const cls = Store.getClassById(id);
    if (!cls) return;
    if (!confirm(`"${cls.name}"을(를) 삭제하시겠습니까?`)) return;

    // 현재 선택된 학급이면 해제
    if (Store.getSelectedClassId() === id) {
      Store.clearSelectedClass();
    }

    Store.deleteClass(id);
    UI.showToast('학급 삭제 완료', 'success');
    renderLandingClassList();
  }

  // === 설정 페이지 진입 핸들러 ===
  function onSettingsPageEnter() {
    const cls = Store.getSelectedClass();

    // 현재 학급 정보 렌더링 (가로 3열)
    const infoContainer = document.getElementById('settings-current-class');
    if (infoContainer && cls) {
      const gc = cls.groupCount || cls.groups?.length || 6;
      infoContainer.innerHTML = `
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--space-lg); text-align: center;">
          <div>
            <div style="font-size: var(--font-size-sm); color: var(--text-tertiary); margin-bottom: var(--space-xs);">학급명</div>
            <div style="font-size: var(--font-size-2xl); font-weight: 700; color: var(--text-primary);">${cls.name}</div>
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

    // 학생 목록 렌더링
    renderSettingsStudentList();

    // 기본 모둠 이름 로딩
    loadDefaultGroupNames();
  }

  // === 설정 페이지: 학생 목록 (6×6 테이블) ===
  function renderSettingsStudentList() {
    const container = document.getElementById('settings-class-list');
    if (!container) return;

    const cls = Store.getSelectedClass();
    if (!cls) {
      container.innerHTML = `<div style="text-align: center; color: var(--text-tertiary); padding: var(--space-lg); font-size: var(--font-size-sm);">학급 정보가 없습니다</div>`;
      return;
    }

    const gc = cls.groupCount || cls.groups?.length || 6;

    // 6×6 테이블로 고정 (최소 6행)
    const minRows = 6;
    let maxMembers = minRows;
    for (let i = 0; i < gc; i++) {
      const len = (cls.groups && cls.groups[i]) ? cls.groups[i].length : 0;
      if (len > maxMembers) maxMembers = len;
    }

    // 헤더 행 (모둠명)
    let headerCells = '';
    for (let i = 0; i < gc; i++) {
      const groupName = (cls.groupNames && cls.groupNames[i]) || `${i + 1}모둠`;
      headerCells += `<th>${groupName}</th>`;
    }

    // 학생 행 (최소 6행 보장)
    let bodyRows = '';
    for (let row = 0; row < maxMembers; row++) {
      let cells = '';
      for (let col = 0; col < gc; col++) {
        const members = (cls.groups && cls.groups[col]) || [];
        const m = members[row];
        if (m) {
          const name = typeof m === 'string' ? m : m.name;
          if (row === 0) {
            // 모둠장: 별을 좌측 상단 코너에 배치
            cells += `<td class="leader-cell"><span class="leader-badge">⭐</span>${name}</td>`;
          } else {
            cells += `<td>${name}</td>`;
          }
        } else {
          cells += `<td></td>`;
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

  // === 학급 삭제 (레거시 호환) ===
  function deleteClass(id) {
    const cls = Store.getClassById(id);
    if (!cls) return;
    if (!confirm(`"${cls.name}"을(를) 삭제하시겠습니까?`)) return;
    Store.deleteClass(id);
    UI.showToast('학급 삭제 완료', 'success');
    renderLandingClassList();
    refreshAllSelects();
  }

  // === 기본 모둠 이름 관리 ===
  function loadDefaultGroupNames() {
    const container = document.getElementById('default-group-names-list');
    if (!container) return;

    const names = Store.getDefaultGroupNames();
    container.innerHTML = '';

    names.forEach((name, i) => {
      createPillInput(container, name, i);
    });
  }

  function createPillInput(container, value, idx) {
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'pill-input';
    input.maxLength = 10;
    input.placeholder = `${idx + 1}모둠`;
    input.value = value || '';
    input.dataset.idx = idx;
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
    container.lastElementChild.focus();
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
    inputs.forEach((input, i) => {
      const val = input.value.trim();
      names.push(val || `${i + 1}모둠`);
    });

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
    renderLandingClassList,
    deleteLandingClass,
    deleteClass,
    onSettingsPageEnter,
    renderSettingsStudentList,
    downloadCSVTemplate,
    importFromGoogleSheets,
  };
})();
