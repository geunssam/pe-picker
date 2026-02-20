import { withTimeout } from '../shared/promise-utils.js';
import { AuthManager } from '../auth-manager.js';
import { getFirestoreInstance } from '../firebase-config.js';
import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  writeBatch,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

const FIRESTORE_TIMEOUT_MS = 10000;

function getFirestoreDb() {
  return getFirestoreInstance();
}

function getUserId() {
  const user = AuthManager.getCurrentUser();
  return user?.uid || null;
}

/**
 * 학급 문서용 데이터 정제 (students 배열은 제외 — 서브컬렉션으로 별도 저장)
 */
function sanitizeClassData(classData) {
  if (!classData || typeof classData !== 'object') {
    return null;
  }

  const {
    name = '학급',
    teamNames = [],
    teams = [],
    teamCount = 6,
    createdAt,
    year,
    grade,
    students = [],
  } = classData;

  const safeTeamNames = Array.isArray(teamNames) ? teamNames : [];
  const safeTeams = Array.isArray(teams) ? teams : [];
  // Firestore는 중첩 배열(nested arrays)을 지원하지 않으므로 각 모둠을 JSON 문자열로 인코딩
  const encodedTeams = safeTeams.map(g => (Array.isArray(g) ? JSON.stringify(g) : '[]'));

  // thermostat 필드는 classData에 있으면 포함
  const thermostat = classData.thermostat || null;

  const result = {
    name,
    teamNames: safeTeamNames,
    teams: encodedTeams,
    teamCount: parseInt(teamCount, 10) || safeTeams.length || 6,
    studentCount: Array.isArray(students) ? students.length : 0,
    year: parseInt(year, 10) || new Date().getFullYear(),
    grade: grade || '',
    createdAt: createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  if (thermostat) {
    result.thermostat = thermostat;
  }

  return result;
}

/**
 * 학급 문서를 Firestore에 동기화 (학생 데이터는 서브컬렉션으로 별도 저장)
 */
export async function syncClassToFirestore(classData) {
  if (!classData || !classData.id) return null;

  const db = getFirestoreDb();
  const userId = getUserId();
  if (!db || !userId) return null;

  const payload = sanitizeClassData(classData);
  const ref = doc(db, 'users', userId, 'classes', classData.id);
  try {
    await withTimeout(setDoc(ref, payload, { merge: true }), FIRESTORE_TIMEOUT_MS, '클래스 동기화');

    // 학생 서브컬렉션도 동기화
    if (Array.isArray(classData.students) && classData.students.length > 0) {
      await syncStudentsToFirestore(classData.id, classData.students);
    }
  } catch (error) {
    console.error('[Firestore] 클래스 동기화 실패:', error);
    throw error;
  }
  return classData.id;
}

/**
 * 학생 배열 → 서브컬렉션 개별 문서 쓰기
 * @param {string} classId
 * @param {Array} students
 */
export async function syncStudentsToFirestore(classId, students) {
  const db = getFirestoreDb();
  const userId = getUserId();
  if (!db || !userId || !classId) return;

  try {
    const batch = writeBatch(db);

    for (const student of students) {
      if (!student.id) continue;
      const studentRef = doc(db, 'users', userId, 'classes', classId, 'students', student.id);
      const studentData = {
        name: student.name || '',
        number: parseInt(student.number, 10) || 0,
        gender: student.gender || '',
        team: student.team || '',
        sportsAbility: student.sportsAbility || '',
        tags: Array.isArray(student.tags) ? student.tags : [],
        note: student.note || '',
      };
      // badges, xp는 이미 문서에 있으면 merge로 보존
      batch.set(studentRef, studentData, { merge: true });
    }

    await withTimeout(batch.commit(), FIRESTORE_TIMEOUT_MS, '학생 서브컬렉션 동기화');
  } catch (error) {
    console.error('[Firestore] 학생 서브컬렉션 동기화 실패:', error);
  }
}

/**
 * 서브컬렉션에서 학생 배열 읽기
 * @param {string} classId
 * @returns {Promise<Array>} 학생 배열 (badges, xp 포함)
 */
export async function hydrateStudentsFromFirestore(classId) {
  const db = getFirestoreDb();
  const userId = getUserId();
  if (!db || !userId || !classId) return [];

  try {
    const studentsRef = collection(db, 'users', userId, 'classes', classId, 'students');
    const snap = await withTimeout(
      getDocs(studentsRef),
      FIRESTORE_TIMEOUT_MS,
      '학생 서브컬렉션 읽기'
    );

    return snap.docs.map(d => {
      const data = d.data();
      return {
        id: d.id,
        name: data.name || '',
        number: parseInt(data.number, 10) || 0,
        gender: data.gender || '',
        team: data.team || '',
        sportsAbility: data.sportsAbility || '',
        tags: Array.isArray(data.tags) ? data.tags : [],
        note: data.note || '',
        badges: Array.isArray(data.badges) ? data.badges : [],
        xp: parseInt(data.xp, 10) || 0,
      };
    });
  } catch (error) {
    console.error('[Firestore] 학생 서브컬렉션 읽기 실패:', error);
    return [];
  }
}

/**
 * 학급 삭제 시 학생 서브컬렉션도 함께 삭제
 */
export async function deleteClassFromFirestore(classId) {
  const db = getFirestoreDb();
  const userId = getUserId();
  if (!db || !userId || !classId) return;

  try {
    // 먼저 학생 서브컬렉션 삭제
    const studentsRef = collection(db, 'users', userId, 'classes', classId, 'students');
    const snap = await withTimeout(
      getDocs(studentsRef),
      FIRESTORE_TIMEOUT_MS,
      '학생 서브컬렉션 조회'
    );

    if (!snap.empty) {
      const batch = writeBatch(db);
      snap.docs.forEach(d => batch.delete(d.ref));
      await withTimeout(batch.commit(), FIRESTORE_TIMEOUT_MS, '학생 서브컬렉션 삭제');
    }

    // 학급 문서 삭제
    const ref = doc(db, 'users', userId, 'classes', classId);
    await withTimeout(deleteDoc(ref), FIRESTORE_TIMEOUT_MS, '클래스 삭제 동기화');
  } catch (error) {
    console.error('[Firestore] 클래스 삭제 실패:', error);
  }
}
