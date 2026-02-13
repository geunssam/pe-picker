/* ============================================
   PE Picker - Teacher Onboarding Wizard
   5단계 복수 학급 생성 위저드
   ============================================ */

const WizardManager = (() => {
  let currentStep = 1;
  let wizardData = {
    schoolLevel: null,
    selectedGrades: [],   // 복수 선택
    classCount: {},       // { 3: 3, 4: 2 }
    studentCounts: {},    // { "3-1": 20, "3-2": 20, ... }
    teacherName: ''
  };

  const SCHOOL_LEVELS = {
    elementary: { label: '초등학교', grades: [1, 2, 3, 4, 5, 6] },
    middle: { label: '중학교', grades: [1, 2, 3] },
    high: { label: '고등학교', grades: [1, 2, 3] }
  };

  function init() {
    setupStep1();
    setupStep2();
    setupStep3();
    setupStep4();
    setupStep5();
  }

  // ===== Step 1: 학교급 선택 =====
  function setupStep1() {
    const options = document.querySelectorAll('#wizard-step-1 .wizard-option-btn');
    const nextBtn = document.getElementById('wizard-step1-next');

    options.forEach(btn => {
      btn.addEventListener('click', () => {
        options.forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        wizardData.schoolLevel = btn.dataset.value;
        nextBtn.disabled = false;
      });
    });

    nextBtn.addEventListener('click', () => {
      if (wizardData.schoolLevel) {
        renderGradeOptions();
        goToStep(2);
      }
    });
  }

  // ===== Step 2: 담당 학년 복수 선택 =====
  function setupStep2() {
    document.getElementById('wizard-step2-back').addEventListener('click', () => goToStep(1));
    document.getElementById('wizard-step2-next').addEventListener('click', () => {
      if (wizardData.selectedGrades.length > 0) {
        renderClassCountList();
        goToStep(3);
      }
    });
  }

  function renderGradeOptions() {
    const container = document.getElementById('wizard-grade-options');
    const schoolInfo = SCHOOL_LEVELS[wizardData.schoolLevel];

    container.innerHTML = schoolInfo.grades.map(grade => `
      <button class="wizard-option-btn wizard-option-btn-compact" data-grade="${grade}">
        <span class="wizard-option-label">${grade}학년</span>
      </button>
    `).join('');

    const gradeButtons = container.querySelectorAll('.wizard-option-btn');
    gradeButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const grade = parseInt(btn.dataset.grade);
        toggleGrade(grade, btn);
      });
    });
  }

  function toggleGrade(grade, btn) {
    const index = wizardData.selectedGrades.indexOf(grade);
    if (index > -1) {
      // 이미 선택됨 → 제거
      wizardData.selectedGrades.splice(index, 1);
      btn.classList.remove('selected');
    } else {
      // 선택 추가
      wizardData.selectedGrades.push(grade);
      wizardData.selectedGrades.sort((a, b) => a - b);
      btn.classList.add('selected');
    }

    // 다음 버튼 활성화
    document.getElementById('wizard-step2-next').disabled = wizardData.selectedGrades.length === 0;
  }

  // ===== Step 3: 학년별 반 수 설정 =====
  function setupStep3() {
    document.getElementById('wizard-step3-back').addEventListener('click', () => goToStep(2));
    document.getElementById('wizard-step3-next').addEventListener('click', () => {
      renderStudentCountList();
      goToStep(4);
    });
  }

  function renderClassCountList() {
    const container = document.getElementById('wizard-class-count-list');

    // 기본값 설정 (3반)
    wizardData.selectedGrades.forEach(grade => {
      if (!wizardData.classCount[grade]) {
        wizardData.classCount[grade] = 3;
      }
    });

    container.innerHTML = wizardData.selectedGrades.map(grade => `
      <div class="wizard-list-item">
        <span class="wizard-list-label">${grade}학년</span>
        <div class="wizard-counter">
          <button class="wizard-counter-btn" data-action="decrease" data-grade="${grade}">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
          </button>
          <span class="wizard-counter-value" id="class-count-${grade}">${wizardData.classCount[grade]}반</span>
          <button class="wizard-counter-btn" data-action="increase" data-grade="${grade}">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
          </button>
        </div>
      </div>
    `).join('');

    // 이벤트 바인딩
    container.querySelectorAll('.wizard-counter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const grade = parseInt(btn.dataset.grade);
        const action = btn.dataset.action;
        adjustClassCount(grade, action === 'increase' ? 1 : -1);
      });
    });
  }

  function adjustClassCount(grade, delta) {
    const current = wizardData.classCount[grade] || 1;
    const newCount = Math.max(1, Math.min(15, current + delta));
    wizardData.classCount[grade] = newCount;
    document.getElementById(`class-count-${grade}`).textContent = `${newCount}반`;
  }

  // ===== Step 4: 학급별 학생 수 설정 =====
  function setupStep4() {
    document.getElementById('wizard-step4-back').addEventListener('click', () => goToStep(3));
    document.getElementById('wizard-step4-next').addEventListener('click', () => goToStep(5));
  }

  function renderStudentCountList() {
    const container = document.getElementById('wizard-student-count-list');

    // 기본값 설정 (20명으로 변경)
    wizardData.selectedGrades.forEach(grade => {
      const count = wizardData.classCount[grade];
      for (let i = 1; i <= count; i++) {
        const key = `${grade}-${i}`;
        if (!wizardData.studentCounts[key]) {
          wizardData.studentCounts[key] = 20;  // 20명으로 변경
        }
      }
    });

    container.innerHTML = wizardData.selectedGrades.map(grade => {
      const count = wizardData.classCount[grade];
      const classItems = Array.from({ length: count }, (_, i) => i + 1).map(classNum => {
        const key = `${grade}-${classNum}`;
        return `
          <div class="wizard-list-item wizard-list-item-sm">
            <span class="wizard-list-label-sm">${classNum}반</span>
            <div class="wizard-counter wizard-counter-sm">
              <button class="wizard-counter-btn wizard-counter-btn-sm" data-action="decrease" data-key="${key}">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
              </button>
              <span class="wizard-counter-value wizard-counter-value-sm" id="student-count-${key}">${wizardData.studentCounts[key]}명</span>
              <button class="wizard-counter-btn wizard-counter-btn-sm" data-action="increase" data-key="${key}">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
              </button>
            </div>
          </div>
        `;
      }).join('');

      return `
        <div class="wizard-grade-group">
          <h3 class="wizard-grade-group-title">${grade}학년</h3>
          <div class="wizard-grade-group-content">
            ${classItems}
          </div>
        </div>
      `;
    }).join('');

    // 이벤트 바인딩
    container.querySelectorAll('.wizard-counter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const key = btn.dataset.key;
        const action = btn.dataset.action;
        adjustStudentCount(key, action === 'increase' ? 1 : -1);
      });
    });
  }

  function adjustStudentCount(key, delta) {
    const current = wizardData.studentCounts[key] || 20;
    const newCount = Math.max(1, Math.min(45, current + delta));
    wizardData.studentCounts[key] = newCount;
    document.getElementById(`student-count-${key}`).textContent = `${newCount}명`;
  }

  // ===== Step 5: 교사 이름 입력 =====
  function setupStep5() {
    const nameInput = document.getElementById('wizard-teacher-name');
    const completeBtn = document.getElementById('wizard-step5-complete');

    nameInput.addEventListener('input', () => {
      wizardData.teacherName = nameInput.value.trim();
      // 교사 이름은 선택사항이므로 항상 활성화
      completeBtn.disabled = false;
    });

    document.getElementById('wizard-step5-back').addEventListener('click', () => goToStep(4));
    completeBtn.addEventListener('click', handleComplete);
  }

  // ===== 완료 처리 =====
  async function handleComplete() {
    console.log('🎯 handleComplete 시작');

    // 로딩 표시
    const loadingEl = document.getElementById('wizard-loading');
    const loadingText = document.getElementById('wizard-loading-text');
    loadingEl.style.display = 'flex';

    // 학급 수 계산
    let totalClasses = 0;
    wizardData.selectedGrades.forEach(grade => {
      totalClasses += wizardData.classCount[grade];
    });

    loadingText.textContent = `${totalClasses}개 학급을 생성하는 중...`;

    // 교사 프로필 저장 (localStorage)
    Store.saveTeacherProfile({
      schoolLevel: wizardData.schoolLevel,
      grades: wizardData.selectedGrades,
      teacherName: wizardData.teacherName || '체육 선생님'
    });

    // 모든 학급 생성 (localStorage)
    const createdClasses = [];
    wizardData.selectedGrades.forEach(grade => {
      const count = wizardData.classCount[grade];
      for (let i = 1; i <= count; i++) {
        const key = `${grade}-${i}`;
        const studentCount = wizardData.studentCounts[key];
        const className = `${grade}학년 ${i}반`;

        // 학생 배열 생성 (빈 명단)
        const students = Array.from({ length: studentCount }, (_, idx) => ({
          id: `stu_${Date.now()}_${grade}_${i}_${idx}`,
          name: '',
          number: idx + 1,
          gender: '',
          sportsAbility: '',
          tags: [],
          note: ''
        }));

        const newClass = Store.addClass(className, students);
        createdClasses.push({ classId: newClass.id, className, students, grade });
      }
    });

    console.log(`✅ localStorage에 ${createdClasses.length}개 학급 저장 완료`);

    // Google 로그인인 경우 Firestore에 저장
    const user = typeof AuthManager !== 'undefined' ? AuthManager.getCurrentUser() : null;
    console.log('👤 현재 사용자:', user);

    if (user && user.mode === 'google') {
      console.log('✅ Google 모드 확인 - Firestore 저장 시작');
      loadingText.textContent = '클라우드에 저장 중... 잠시만 기다려주세요';

      const success = await saveToFirestoreWithRetry(user.uid, createdClasses);

      if (!success) {
        const shouldContinue = confirm(
          '⚠️ 클라우드 저장에 실패했습니다.\n\n' +
          '로컬에는 저장되었지만, 다른 기기에서는 접근할 수 없습니다.\n\n' +
          '계속 진행하시겠습니까? (취소하면 다시 시도)'
        );

        if (!shouldContinue) {
          loadingEl.style.display = 'none';
          return; // 완료 중단
        }
      }
    } else {
      console.warn('❌ Firestore 저장 조건 불만족:', {
        userExists: !!user,
        mode: user?.mode,
        authManagerDefined: typeof AuthManager !== 'undefined'
      });
    }

    console.log('🚀 index.html로 이동 예정');

    // UX를 위한 약간의 지연
    setTimeout(() => {
      window.location.href = 'index.html';
    }, 1000);
  }

  // ===== Firestore 저장 (재시도 로직 포함) =====
  async function saveToFirestoreWithRetry(uid, createdClasses, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔄 Firestore 저장 시도 ${attempt}/${maxRetries}`);
        await saveToFirestore(uid, createdClasses);

        // 저장 검증
        const verified = await verifyFirestoreSave(uid, createdClasses.map(c => c.classId));
        if (verified) {
          return true; // 성공
        } else {
          throw new Error('저장 검증 실패');
        }
      } catch (error) {
        console.error(`❌ 시도 ${attempt} 실패:`, error);

        if (attempt === maxRetries) {
          // 최종 실패
          return false;
        }

        // 1초 대기 후 재시도
        console.log('⏳ 1초 후 재시도...');
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }

  // ===== Firestore 저장 =====
  async function saveToFirestore(uid, createdClasses) {
    try {
      console.log('🔥 Firestore 저장 시작:', {
        uid,
        classCount: createdClasses.length,
        classes: createdClasses.map(c => c.className)
      });

      const db = typeof FirebaseConfig !== 'undefined' ? FirebaseConfig.getFirestore() : null;
      if (!db) {
        const errorMsg = '⚠️ Firestore가 초기화되지 않았습니다.';
        console.error(errorMsg);
        throw new Error(errorMsg);
      }

      console.log('✅ Firestore 연결 확인');
      const batch = db.batch();

      // 사용자 문서 업데이트 (merge: true로 안전하게)
      const userRef = db.collection('users').doc(uid);
      console.log('📝 users 문서 업데이트:', {
        uid,
        isOnboarded: true,
        selectedClassId: createdClasses[0]?.classId
      });

      batch.set(userRef, {
        displayName: wizardData.teacherName || AuthManager.getCurrentUser().displayName,
        schoolLevel: wizardData.schoolLevel,
        selectedClassId: createdClasses.length > 0 ? createdClasses[0].classId : null,
        isOnboarded: true,  // ✅ 온보딩 완료 플래그 추가
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true });

      // 각 학급 및 학생 생성
      createdClasses.forEach(({ classId, className, students, grade }) => {
        console.log(`📚 학급 생성: ${className} (${students.length}명)`);

        // 학급 문서 생성
        const classRef = db.collection('users').doc(uid).collection('classes').doc(classId);
        batch.set(classRef, {
          name: className,
          year: new Date().getFullYear(),
          grade: grade.toString(),
          studentCount: students.length,
          groupNames: ['하나', '믿음', '우정', '희망', '협력', '사랑'],
          groups: [],
          groupCount: 6,
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        // 학생 서브컬렉션 생성
        students.forEach((student, index) => {
          const studentId = `student-${Date.now()}-${classId}-${index}`;
          const studentRef = db.collection('users').doc(uid)
            .collection('classes').doc(classId)
            .collection('students').doc(studentId);

          batch.set(studentRef, {
            name: student.name || '',
            number: student.number,
            gender: student.gender || '',
            sportsAbility: student.sportsAbility || '',
            tags: student.tags || [],
            note: student.note || '',
            groupIndex: -1,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
          });
        });
      });

      console.log('💾 batch.commit() 시작...');

      // 타임아웃 추가 (30초 - 배치 작업이므로 더 긴 시간 허용)
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('TIMEOUT')), 30000);
      });

      await Promise.race([
        batch.commit(),
        timeoutPromise
      ]);

      console.log(`✅ Firestore 저장 완료! ${createdClasses.length}개 학급`);

    } catch (error) {
      if (error.message === 'TIMEOUT') {
        console.error('⏱ Firestore 저장 타임아웃 (30초)');
      } else {
        console.error('❌ Firestore 저장 실패:', {
          error: error.message,
          code: error.code,
          stack: error.stack
        });
      }
      throw error; // 에러를 다시 throw하여 재시도 로직에서 처리
    }
  }

  // ===== Firestore 저장 검증 =====
  async function verifyFirestoreSave(uid, classIds) {
    try {
      console.log('🔍 Firestore 저장 검증 시작...');
      const db = FirebaseConfig.getFirestore();

      for (const classId of classIds) {
        const classDoc = await db.collection('users').doc(uid)
          .collection('classes').doc(classId).get();

        if (!classDoc.exists) {
          console.error(`❌ 검증 실패: 학급 ${classId} 미존재`);
          return false;
        }
      }

      console.log('✅ Firestore 저장 검증 완료');
      return true;
    } catch (error) {
      console.error('❌ 검증 오류:', error);
      return false;
    }
  }

  // ===== 단계 이동 =====
  function goToStep(step) {
    // Hide all steps
    document.querySelectorAll('.wizard-step').forEach(s => s.classList.remove('active'));

    // Show target step
    document.getElementById(`wizard-step-${step}`).classList.add('active');

    // Update progress
    currentStep = step;
    document.getElementById('wizard-current-step').textContent = step;
    const progressFill = document.getElementById('wizard-progress-fill');
    progressFill.style.width = `${(step / 5) * 100}%`;  // 5단계로 변경
  }

  return { init };
})();

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => WizardManager.init());
