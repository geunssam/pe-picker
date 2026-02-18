import { withTimeout } from '../shared/promise-utils.js';
import { AuthManager } from '../auth-manager.js';
import { getFirestoreInstance } from '../firebase-config.js';
import {
  doc,
  setDoc,
  deleteDoc,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

const FIRESTORE_TIMEOUT_MS = 10000;

function getFirestoreDb() {
  return getFirestoreInstance();
}

function getUserId() {
  const user = AuthManager.getCurrentUser();
  return user?.uid || null;
}

function sanitizeClassData(classData) {
  if (!classData || typeof classData !== 'object') {
    return null;
  }

  const {
    id,
    name = '학급',
    students = [],
    teamNames = [],
    teams = [],
    teamCount = 6,
    createdAt,
    year,
    grade,
  } = classData;

  const safeTeamNames = Array.isArray(teamNames) ? teamNames : [];
  const safeTeams = Array.isArray(teams) ? teams : [];
  // Firestore는 중첩 배열(nested arrays)을 지원하지 않으므로 각 모둠을 JSON 문자열로 인코딩
  const encodedTeams = safeTeams.map(g => (Array.isArray(g) ? JSON.stringify(g) : '[]'));
  const safeStudents = Array.isArray(students)
    ? students.map(student => ({
        id: student.id || '',
        name: student.name || '',
        number: parseInt(student.number, 10) || 0,
        gender: student.gender || '',
        team: student.team || '',
        sportsAbility: student.sportsAbility || '',
        tags: Array.isArray(student.tags) ? student.tags : [],
        note: student.note || '',
      }))
    : [];

  return {
    name,
    students: safeStudents,
    teamNames: safeTeamNames,
    teams: encodedTeams,
    teamCount: parseInt(teamCount, 10) || safeTeams.length || 6,
    studentCount: safeStudents.length,
    year: parseInt(year, 10) || new Date().getFullYear(),
    grade: grade || '',
    createdAt: createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export async function syncClassToFirestore(classData) {
  if (!classData || !classData.id) return null;

  const db = getFirestoreDb();
  const userId = getUserId();
  if (!db || !userId) return null;

  const payload = sanitizeClassData(classData);
  const ref = doc(db, 'users', userId, 'classes', classData.id);
  try {
    await withTimeout(setDoc(ref, payload, { merge: true }), FIRESTORE_TIMEOUT_MS, '클래스 동기화');
  } catch (error) {
    console.error('[Firestore] 클래스 동기화 실패:', error);
    throw error;
  }
  return classData.id;
}

export async function deleteClassFromFirestore(classId) {
  const db = getFirestoreDb();
  const userId = getUserId();
  if (!db || !userId || !classId) return;

  const ref = doc(db, 'users', userId, 'classes', classId);
  await withTimeout(deleteDoc(ref), FIRESTORE_TIMEOUT_MS, '클래스 삭제 동기화');
}
