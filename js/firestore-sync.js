/* ============================================
   PE Picker - Firestore 실시간 동기화
   다른 기기의 변경사항을 실시간으로 반영
   ============================================ */

import { FirebaseConfig } from './firebase-config.js';
import { Store } from './shared/store.js';

let listeners = [];
let isActive = false;

/**
 * 실시간 동기화 시작
 * @param {string} uid - 사용자 ID
 */
function start(uid) {
  if (isActive) {
    console.log('🔄 실시간 동기화가 이미 활성화되어 있습니다.');
    return;
  }

  console.log('🔄 Firestore 실시간 동기화 시작:', uid);

  const db = FirebaseConfig.getFirestore();
  if (!db) {
    console.error('❌ Firestore가 초기화되지 않았습니다.');
    return;
  }

  // 1. 학급 컬렉션 리스너
  const classesListener = db
    .collection('users')
    .doc(uid)
    .collection('classes')
    .onSnapshot(
      snapshot => handleClassesSnapshot(snapshot, uid, db),
      error => {
        console.error('❌ 학급 리스너 오류:', error);
      }
    );

  // 2. 사용자 문서 리스너 (설정, 선택된 학급 등)
  const userListener = db
    .collection('users')
    .doc(uid)
    .onSnapshot(
      snapshot => handleUserSnapshot(snapshot),
      error => {
        console.error('❌ 사용자 리스너 오류:', error);
      }
    );

  listeners.push(classesListener, userListener);
  isActive = true;
  console.log('✅ 실시간 동기화 활성화 완료');
}

/**
 * 학급 컬렉션 변경사항 처리
 */
async function handleClassesSnapshot(snapshot, uid, db) {
  console.log('📡 학급 데이터 변경 감지:', snapshot.docChanges().length, '개 변경');

  const changes = snapshot.docChanges();
  if (changes.length === 0) return;

  // 현재 localStorage의 학급 목록
  const localClasses = Store.getClasses();
  let hasChanges = false;

  for (const change of changes) {
    const classId = change.doc.id;
    const classData = change.doc.data();

    if (change.type === 'added') {
      // 새 학급 추가
      const exists = localClasses.find(c => c.id === classId);
      if (!exists) {
        console.log('➕ 새 학급 추가:', classData.name);
        const students = await loadStudents(uid, classId, db);
        localClasses.push(convertToLocalClass(classId, classData, students));
        hasChanges = true;
      }
    } else if (change.type === 'modified') {
      // 학급 수정
      const idx = localClasses.findIndex(c => c.id === classId);
      if (idx !== -1) {
        console.log('✏️ 학급 수정:', classData.name);
        const students = await loadStudents(uid, classId, db);
        localClasses[idx] = convertToLocalClass(classId, classData, students);
        hasChanges = true;
      }
    } else if (change.type === 'removed') {
      // 학급 삭제
      const idx = localClasses.findIndex(c => c.id === classId);
      if (idx !== -1) {
        console.log('➖ 학급 삭제:', classData.name);
        localClasses.splice(idx, 1);
        hasChanges = true;
      }
    }
  }

  // localStorage 업데이트
  if (hasChanges) {
    Store.saveClasses(localClasses);
    console.log('✅ localStorage 업데이트 완료');

    // UI 리프레시
    refreshUI();
  }
}

/**
 * 사용자 문서 변경사항 처리
 */
function handleUserSnapshot(snapshot) {
  if (!snapshot.exists) return;

  const userData = snapshot.data();
  console.log('📡 사용자 데이터 변경 감지');

  let hasChanges = false;

  // 설정 동기화
  if (userData.settings) {
    const currentSettings = Store.getSettings();
    if (JSON.stringify(currentSettings) !== JSON.stringify(userData.settings)) {
      console.log('⚙️ 설정 업데이트');
      Store.saveSettings(userData.settings);
      hasChanges = true;
    }
  }

  // 선택된 학급 동기화
  if (userData.selectedClassId) {
    const currentSelected = Store.getSelectedClassId();
    if (currentSelected !== userData.selectedClassId) {
      console.log('🎯 선택된 학급 업데이트:', userData.selectedClassId);
      Store.setSelectedClassId(userData.selectedClassId);
      hasChanges = true;
    }
  }

  // UI 리프레시
  if (hasChanges) {
    refreshUI();
  }
}

/**
 * 학생 데이터 로드
 */
async function loadStudents(uid, classId, db) {
  try {
    const studentsSnapshot = await db
      .collection('users')
      .doc(uid)
      .collection('classes')
      .doc(classId)
      .collection('students')
      .orderBy('number')
      .get();

    return studentsSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name || '',
        number: data.number,
        gender: data.gender || '',
        sportsAbility: data.sportsAbility || '',
        tags: data.tags || [],
        note: data.note || '',
        groupIndex: data.groupIndex || -1,
      };
    });
  } catch (error) {
    console.error('❌ 학생 데이터 로드 실패:', error);
    return [];
  }
}

/**
 * Firestore 데이터를 로컬 형식으로 변환
 */
function convertToLocalClass(classId, classData, students) {
  const decodeGroupsFromFirestore = (rawGroups, groupCount = 6) => {
    if (Array.isArray(rawGroups)) return rawGroups;
    if (!rawGroups || typeof rawGroups !== 'object') {
      return Array.from({ length: groupCount }, () => []);
    }

    const entries = Object.entries(rawGroups);
    if (entries.length === 0) {
      return Array.from({ length: groupCount }, () => []);
    }

    const ordered = entries
      .map(([key, members]) => {
        const numeric = parseInt(String(key).replace(/\D/g, ''), 10);
        return {
          index: Number.isFinite(numeric) ? numeric : Number.MAX_SAFE_INTEGER,
          members: Array.isArray(members) ? members : [],
        };
      })
      .sort((a, b) => a.index - b.index);

    const groups = ordered.map(item => item.members);
    while (groups.length < groupCount) {
      groups.push([]);
    }
    return groups;
  };

  const groupCount = classData.groupCount || 6;
  return {
    id: classId,
    name: classData.name,
    students: students,
    groupNames: classData.groupNames || ['하나', '믿음', '우정', '희망', '협력', '사랑'],
    groups: decodeGroupsFromFirestore(classData.groups, groupCount),
    groupCount,
    createdAt: classData.createdAt
      ? classData.createdAt.toDate().toISOString()
      : new Date().toISOString(),
  };
}

/**
 * UI 리프레시
 */
function refreshUI() {
  console.log('🔄 UI 리프레시 시작');

  // 현재 라우트 확인
  const currentRoute = window.App ? window.App.getCurrentRoute() : null;

  if (currentRoute === 'class-selector') {
    // 학급 선택 페이지 - 학급 목록 리렌더링
    if (window.ClassManager) {
      console.log('📋 학급 목록 리렌더링');
      window.ClassManager.renderLandingClassList();
    }
  } else if (currentRoute === 'tag-game') {
    // 술래뽑기 페이지 - 학생 목록 리렌더링
    if (window.TagGame) {
      console.log('🎯 술래뽑기 페이지 리렌더링');
      window.TagGame.onPageEnter();
    }
  } else if (currentRoute === 'group-manager') {
    // 모둠뽑기 페이지 - 리렌더링
    if (window.GroupManager) {
      console.log('👥 모둠뽑기 페이지 리렌더링');
      window.GroupManager.onPageEnter();
    }
  } else if (currentRoute === 'settings') {
    // 설정 페이지 - 리렌더링
    if (window.ClassManager) {
      console.log('⚙️ 설정 페이지 리렌더링');
      window.ClassManager.onSettingsPageEnter();
    }
  }

  // 상단 네비바 업데이트
  updateNavbar();
}

/**
 * 네비바 학급명 업데이트
 */
function updateNavbar() {
  const cls = Store.getSelectedClass();
  const nameEl = document.getElementById('navbar-class-name');
  if (nameEl && cls) {
    nameEl.textContent = cls.name;
  }
}

/**
 * 실시간 동기화 중지
 */
function stop() {
  if (!isActive) return;

  console.log('🛑 실시간 동기화 중지');
  listeners.forEach(unsubscribe => unsubscribe());
  listeners = [];
  isActive = false;
}

/**
 * 동기화 상태 확인
 */
function isEnabled() {
  return isActive;
}

export const FirestoreSync = {
  start,
  stop,
  isEnabled,
};
