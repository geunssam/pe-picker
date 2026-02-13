/* ============================================
   PE Picker - Onboarding Logic
   온보딩 위저드 로직
   ============================================ */

(function() {
  'use strict';

  // ==================== 상태 관리 ====================
  let currentStep = 1;
  let formData = {
    teacherName: '',
    schoolName: '',
    className: '',
    classYear: 2025,
    classGrade: '',
    students: []
  };

  // ==================== DOM 요소 ====================
  const progressFill = document.getElementById('progress-fill');
  const progressText = document.getElementById('progress-text');
  const wizardSteps = document.querySelectorAll('.wizard-step');

  // Step 1 요소
  const teacherNameInput = document.getElementById('teacher-name');
  const schoolNameInput = document.getElementById('school-name');

  // Step 2 요소
  const classNameInput = document.getElementById('class-name');
  const classYearInput = document.getElementById('class-year');
  const classGradeInput = document.getElementById('class-grade');

  // Step 3 요소
  const tabs = document.querySelectorAll('.tab');
  const tabContents = document.querySelectorAll('.tab-content');
  const csvFileInput = document.getElementById('csv-file');
  const csvSelectBtn = document.getElementById('csv-select-btn');
  const uploadArea = document.getElementById('upload-area');
  const csvPreview = document.getElementById('csv-preview');
  const csvFilename = document.getElementById('csv-filename');
  const csvPreviewList = document.getElementById('csv-preview-list');
  const csvRemoveBtn = document.getElementById('csv-remove');
  const studentNamesTextarea = document.getElementById('student-names');
  const manualCount = document.getElementById('manual-count');

  // Step 4 요소
  const summaryTeacher = document.getElementById('summary-teacher');
  const summarySchool = document.getElementById('summary-school');
  const summarySchoolItem = document.getElementById('summary-school-item');
  const summaryClass = document.getElementById('summary-class');
  const summaryClassItem = document.getElementById('summary-class-item');
  const summaryStudents = document.getElementById('summary-students');
  const summaryStudentsItem = document.getElementById('summary-students-item');
  const btnStart = document.getElementById('btn-start');

  // ==================== 초기화 ====================
  function init() {
    // 이미 온보딩 완료된 경우 메인 페이지로 이동
    if (TeacherRepo.isOnboarded()) {
      window.location.href = 'index.html';
      return;
    }

    // 이벤트 리스너 등록
    setupEventListeners();

    // 초기 단계 표시
    updateProgress();
  }

  function setupEventListeners() {
    // 다음 버튼
    document.querySelectorAll('.btn-next').forEach(btn => {
      btn.addEventListener('click', handleNext);
    });

    // 이전 버튼
    document.querySelectorAll('.btn-prev').forEach(btn => {
      btn.addEventListener('click', handlePrev);
    });

    // 건너뛰기 버튼
    document.querySelectorAll('.btn-skip').forEach(btn => {
      btn.addEventListener('click', handleSkip);
    });

    // 시작하기 버튼
    btnStart.addEventListener('click', handleStart);

    // 탭 전환
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const targetTab = tab.dataset.tab;
        switchTab(targetTab);
      });
    });

    // CSV 파일 선택
    csvSelectBtn.addEventListener('click', () => {
      csvFileInput.click();
    });

    csvFileInput.addEventListener('change', handleFileSelect);

    // 드래그 앤 드롭
    uploadArea.addEventListener('dragover', handleDragOver);
    uploadArea.addEventListener('dragleave', handleDragLeave);
    uploadArea.addEventListener('drop', handleDrop);

    // CSV 제거
    csvRemoveBtn.addEventListener('click', clearCSV);

    // 직접 입력 카운트
    studentNamesTextarea.addEventListener('input', updateManualCount);

    // Enter 키 방지 (폼 submit 방지)
    document.querySelectorAll('input').forEach(input => {
      input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
        }
      });
    });
  }

  // ==================== 네비게이션 ====================
  function handleNext(e) {
    const nextStep = parseInt(e.target.dataset.next);

    // 현재 단계 검증
    if (!validateStep(currentStep)) {
      return;
    }

    // 데이터 저장
    saveStepData(currentStep);

    // 다음 단계로 이동
    goToStep(nextStep);
  }

  function handlePrev(e) {
    const prevStep = parseInt(e.target.dataset.prev);
    goToStep(prevStep);
  }

  function handleSkip(e) {
    const skipToStep = parseInt(e.target.dataset.skip);
    goToStep(skipToStep);
  }

  function goToStep(step) {
    currentStep = step;

    // 단계 표시 업데이트
    wizardSteps.forEach(s => {
      s.classList.remove('active');
      if (parseInt(s.dataset.step) === step) {
        s.classList.add('active');
      }
    });

    // 진행 표시기 업데이트
    updateProgress();

    // 마지막 단계면 요약 업데이트
    if (step === 4) {
      updateSummary();
    }

    // 스크롤 최상단으로
    window.scrollTo(0, 0);
  }

  function updateProgress() {
    const progress = (currentStep / 4) * 100;
    progressFill.style.width = progress + '%';
    progressText.textContent = `${currentStep} / 4`;
  }

  // ==================== 검증 ====================
  function validateStep(step) {
    if (step === 1) {
      // Step 1은 선택 사항이므로 항상 통과
      return true;
    }

    if (step === 2) {
      // 학급명은 필수
      if (!classNameInput.value.trim()) {
        alert('학급명을 입력해주세요.');
        classNameInput.focus();
        return false;
      }
      return true;
    }

    if (step === 3) {
      // 학생은 선택 사항
      return true;
    }

    return true;
  }

  function saveStepData(step) {
    if (step === 1) {
      formData.teacherName = teacherNameInput.value.trim();
      formData.schoolName = schoolNameInput.value.trim();
    }

    if (step === 2) {
      formData.className = classNameInput.value.trim();
      formData.classYear = parseInt(classYearInput.value);
      formData.classGrade = classGradeInput.value;
    }

    if (step === 3) {
      // 현재 활성 탭 확인
      const activeTab = document.querySelector('.tab.active').dataset.tab;

      if (activeTab === 'csv') {
        // CSV 데이터는 이미 formData.students에 저장됨
      } else if (activeTab === 'manual') {
        // 직접 입력 데이터 파싱
        const text = studentNamesTextarea.value.trim();
        if (text) {
          formData.students = text.split('\n')
            .map(name => name.trim())
            .filter(name => name.length > 0);
        } else {
          formData.students = [];
        }
      }
    }
  }

  // ==================== 탭 전환 ====================
  function switchTab(tabName) {
    tabs.forEach(tab => {
      tab.classList.remove('active');
      if (tab.dataset.tab === tabName) {
        tab.classList.add('active');
      }
    });

    tabContents.forEach(content => {
      content.classList.remove('active');
      if (content.dataset.tab === tabName) {
        content.classList.add('active');
      }
    });
  }

  // ==================== CSV 처리 ====================
  function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) {
      readCSVFile(file);
    }
  }

  function handleDragOver(e) {
    e.preventDefault();
    uploadArea.classList.add('drag-over');
  }

  function handleDragLeave(e) {
    e.preventDefault();
    uploadArea.classList.remove('drag-over');
  }

  function handleDrop(e) {
    e.preventDefault();
    uploadArea.classList.remove('drag-over');

    const file = e.dataTransfer.files[0];
    if (file) {
      readCSVFile(file);
    }
  }

  function readCSVFile(file) {
    const reader = new FileReader();

    reader.onload = function(e) {
      const text = e.target.result;
      const lines = text.split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);

      if (lines.length === 0) {
        alert('CSV 파일이 비어있습니다.');
        return;
      }

      // 데이터 저장
      formData.students = lines;

      // 미리보기 표시
      showCSVPreview(file.name, lines);
    };

    reader.readAsText(file, 'UTF-8');
  }

  function showCSVPreview(filename, students) {
    csvFilename.textContent = filename;
    csvPreviewList.innerHTML = students
      .map(name => `<span>${name}</span>`)
      .join('');

    uploadArea.style.display = 'none';
    csvPreview.style.display = 'block';
  }

  function clearCSV() {
    formData.students = [];
    csvFileInput.value = '';
    uploadArea.style.display = 'block';
    csvPreview.style.display = 'none';
  }

  // ==================== 직접 입력 카운트 ====================
  function updateManualCount() {
    const text = studentNamesTextarea.value.trim();
    const count = text ? text.split('\n').filter(line => line.trim().length > 0).length : 0;
    manualCount.textContent = count;
  }

  // ==================== 요약 업데이트 ====================
  function updateSummary() {
    // 교사 정보
    const teacherName = formData.teacherName || '로컬 사용자';
    summaryTeacher.textContent = teacherName;

    // 학교 정보
    if (formData.schoolName) {
      summarySchool.textContent = formData.schoolName;
      summarySchoolItem.style.display = 'flex';
    } else {
      summarySchoolItem.style.display = 'none';
    }

    // 학급 정보
    if (formData.className) {
      let classText = formData.className;
      if (formData.classGrade) {
        classText += ` (${formData.classGrade}학년)`;
      }
      summaryClass.textContent = classText;
      summaryClassItem.style.display = 'flex';
    } else {
      summaryClassItem.style.display = 'none';
    }

    // 학생 정보
    if (formData.students.length > 0) {
      summaryStudents.textContent = `${formData.students.length}명`;
      summaryStudentsItem.style.display = 'flex';
    } else {
      summaryStudentsItem.style.display = 'none';
    }
  }

  // ==================== Firestore 저장 ====================
  async function saveToFirestore(uid, classId) {
    try {
      const db = FirebaseConfig.getFirestore();
      if (!db) {
        console.warn('Firestore가 초기화되지 않았습니다.');
        return;
      }

      const batch = db.batch();

      // 1. 사용자 문서 업데이트 (교사 정보)
      const userRef = db.collection('users').doc(uid);
      batch.update(userRef, {
        displayName: formData.teacherName || AuthManager.getCurrentUser().displayName,
        schoolName: formData.schoolName || '',
        selectedClassId: classId,
        isOnboarded: true,  // ✅ 온보딩 완료 플래그 추가
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });

      // 2. 학급 문서 생성 (학급명이 있는 경우만)
      if (formData.className && classId) {
        const classRef = db.collection('users').doc(uid).collection('classes').doc(classId);
        batch.set(classRef, {
          name: formData.className,
          year: formData.classYear,
          grade: formData.classGrade || '',
          studentCount: formData.students.length,
          groupNames: ['하나', '믿음', '우정', '희망', '협력', '사랑'],
          groups: [],
          groupCount: 6,
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        // 3. 학생 서브컬렉션 생성
        formData.students.forEach((studentName, index) => {
          const studentId = `student-${Date.now()}-${index}`;
          const studentRef = db.collection('users').doc(uid)
            .collection('classes').doc(classId)
            .collection('students').doc(studentId);

          batch.set(studentRef, {
            name: studentName,
            number: index + 1,
            gender: '',
            sportsAbility: '',
            tags: [],
            note: '',
            groupIndex: -1,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
          });
        });
      }

      await batch.commit();
      console.log('Firestore 저장 완료');
    } catch (error) {
      console.error('Firestore 저장 실패:', error);
      alert('데이터 저장에 실패했습니다. 로컬에는 저장되었습니다.');
    }
  }

  // ==================== 완료 처리 ====================
  async function handleStart() {
    const user = AuthManager.getCurrentUser();
    const isGoogleMode = user && user.mode === 'google';

    // 1. 교사 프로필 저장 (localStorage)
    const teacherProfile = {
      name: formData.teacherName || (isGoogleMode ? user.displayName : '로컬 사용자'),
      school: formData.schoolName || ''
    };
    TeacherRepo.saveProfile(teacherProfile);

    // 2. 학급 생성 (학급명이 있는 경우만)
    let newClassId = null;
    if (formData.className) {
      const newClass = ClassRepo.create(
        formData.className,
        formData.students,
        null, // groupNames는 기본값 사용
        [], // groups는 빈 배열
        6 // groupCount는 기본값 6
      );

      // 3. 생성된 학급을 선택된 학급으로 설정
      ClassRepo.setSelectedId(newClass.id);
      newClassId = newClass.id;
    }

    // 4. Google 로그인인 경우 Firestore에 저장
    if (isGoogleMode) {
      await saveToFirestore(user.uid, newClassId);
    }

    // 5. 메인 페이지로 이동
    window.location.href = 'index.html';
  }

  // ==================== 실행 ====================
  document.addEventListener('DOMContentLoaded', init);

})();
