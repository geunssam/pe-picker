/* ============================================
   PE Picker - Teacher Onboarding Wizard
   5단계 복수 학급 생성 위저드
   ============================================ */

import { Store } from './shared/store.js';
import { AuthManager } from './auth-manager.js';
import { generateId } from './storage/base-repo.js';
import { syncClassToFirestore } from './class-management/class-firestore.js';
import { syncTeacherProfileToFirestore } from './firestore-sync.js';

let currentStep = 1;
let wizardData = {
  schoolLevel: null,
  selectedGrades: [], // 복수 선택
  classCount: {}, // { 3: 3, 4: 2 }
  studentCounts: {}, // { "3-1": 20, "3-2": 20, ... }
  teacherName: '',
};

const SCHOOL_LEVELS = {
  elementary: { label: '초등학교', grades: [1, 2, 3, 4, 5, 6] },
  middle: { label: '중학교', grades: [1, 2, 3] },
  high: { label: '고등학교', grades: [1, 2, 3] },
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

  container.innerHTML = schoolInfo.grades
    .map(
      grade => `
      <button class="wizard-option-btn wizard-option-btn-compact" data-grade="${grade}">
        <span class="wizard-option-label">${grade}학년</span>
      </button>
    `
    )
    .join('');

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

  container.innerHTML = wizardData.selectedGrades
    .map(
      grade => `
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
    `
    )
    .join('');

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
        wizardData.studentCounts[key] = 20; // 20명으로 변경
      }
    }
  });

  container.innerHTML = wizardData.selectedGrades
    .map(grade => {
      const count = wizardData.classCount[grade];
      const classItems = Array.from({ length: count }, (_, i) => i + 1)
        .map(classNum => {
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
        })
        .join('');

      return `
        <div class="wizard-grade-group">
          <h3 class="wizard-grade-group-title">${grade}학년</h3>
          <div class="wizard-grade-group-content">
            ${classItems}
          </div>
        </div>
      `;
    })
    .join('');

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
  console.log('handleComplete 시작');

  // 로딩 표시
  const loadingEl = document.getElementById('wizard-loading');
  const completeBtn = document.getElementById('wizard-step5-complete');
  if (completeBtn) completeBtn.disabled = true;
  loadingEl.style.display = 'flex';

  // 교사 프로필 저장 (localStorage)
  const teacherProfile = {
    schoolLevel: wizardData.schoolLevel,
    grades: wizardData.selectedGrades,
    teacherName: wizardData.teacherName || '체육 선생님',
    isOnboarded: true,
  };
  Store.saveTeacherProfile(teacherProfile);
  if (AuthManager.isAuthenticated()) {
    await syncTeacherProfileToFirestore(teacherProfile).catch(error => {
      console.warn('[Wizard] teacher profile sync failed:', error);
    });
  }

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
        id: generateId('stu'),
        name: '',
        number: idx + 1,
        gender: '',
        team: '',
        sportsAbility: '',
        tags: [],
        note: '',
      }));

      const newClass = Store.addClass(className, students);
      createdClasses.push({ classId: newClass.id, className, students, grade });
    }
  });

  console.log(`localStorage에 ${createdClasses.length}개 학급 저장 완료`);

  // Firestore 동기화
  if (AuthManager.isAuthenticated()) {
    await Promise.all(
      createdClasses.map(({ classId }) => {
        const cls = Store.getClassById(classId);
        if (!cls) return Promise.resolve();
        return syncClassToFirestore(cls).catch(error => {
          console.warn('[Wizard] class sync failed:', error);
        });
      })
    );
  }

  // UX를 위한 약간의 지연
  setTimeout(() => {
    loadingEl.style.display = 'none';
    // 클래스 선택 화면으로 이동
    window.location.href = 'index.html#class-selector';
  }, 800);
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
  progressFill.style.width = `${(step / 5) * 100}%`; // 5단계로 변경
}

export const WizardManager = { init };
