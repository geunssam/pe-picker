import { Store } from './shared/store.js';
import { AuthManager } from './auth-manager.js';
import { getFirestoreInstance } from './firebase-config.js';
import { withTimeout } from './shared/promise-utils.js';
import { syncClassToFirestore } from './class-management/class-firestore.js';
import { decodeTeamsFromFirestore } from './shared/firestore-utils.js';
import { generateId } from './storage/base-repo.js';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  setDoc,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

const SYNC_TIMEOUT_MS = 10000;
const STORE_UPDATED_EVENT = 'pet-data-updated';
const USER_ID_KEY = 'pet_current_uid';

let db = null;
let currentUserId = null;
let unsubscribeClasses = null;

function notifyStoreUpdated() {
  window.dispatchEvent(new CustomEvent(STORE_UPDATED_EVENT, { detail: { source: 'firestore' } }));
}

function getDb() {
  if (!db) db = getFirestoreInstance();
  return db;
}

function getCurrentUserId() {
  if (currentUserId) return currentUserId;
  const user = AuthManager.getCurrentUser();
  return user?.uid || null;
}

function normalizeStudent(raw, fallbackNumber = 0) {
  if (!raw || typeof raw !== 'object') {
    return {
      id: generateId('stu'),
      name: '',
      number: fallbackNumber || 0,
      gender: '',
      team: '',
      sportsAbility: '',
      tags: [],
      note: '',
    };
  }

  return {
    id: raw.id || generateId('stu'),
    name: raw.name || '',
    number: Number.isFinite(parseInt(raw.number, 10)) ? parseInt(raw.number, 10) : fallbackNumber,
    gender: raw.gender || '',
    team: raw.team || '',
    sportsAbility: raw.sportsAbility || '',
    tags: Array.isArray(raw.tags) ? raw.tags : [],
    note: raw.note || '',
  };
}

function normalizeClassFromSnapshot(classId, data = {}) {
  const safeStudents = Array.isArray(data.students)
    ? data.students.map((student, idx) => normalizeStudent(student, idx + 1))
    : [];

  const teamNames = Array.isArray(data.teamNames ?? data.groupNames)
    ? (data.teamNames ?? data.groupNames)
    : [];
  const teams = decodeTeamsFromFirestore(
    Array.isArray(data.teams ?? data.groups) ? (data.teams ?? data.groups) : [],
    Math.max(6, teamNames.length)
  );
  const teamCountRaw = parseInt(data.teamCount ?? data.groupCount, 10);
  const teamCount = Number.isFinite(teamCountRaw) ? teamCountRaw : Math.max(6, teams.length);

  return {
    id: classId,
    name: data.name || '학급',
    students: safeStudents,
    teamNames: teamNames.length
      ? teamNames
      : Array.from({ length: teamCount }, (_, i) => `${i + 1}모둠`),
    teams: teams.length ? teams : Array.from({ length: teamCount }, () => []),
    teamCount,
    createdAt: (() => {
      const val = data.createdAt;
      if (!val) return new Date().toISOString();
      if (typeof val === 'string') return val;
      if (typeof val.toDate === 'function') return val.toDate().toISOString();
      return new Date().toISOString();
    })(),
    year: parseInt(data.year, 10) || new Date().getFullYear(),
    grade: data.grade || '',
  };
}

async function hydrateProfileFromFirestore() {
  const database = getDb();
  const uid = getCurrentUserId();
  if (!database || !uid) return;

  const userRef = doc(database, 'users', uid);
  const snap = await withTimeout(getDoc(userRef), SYNC_TIMEOUT_MS, 'user profile load');
  if (!snap.exists()) return;

  const data = snap.data() || {};

  if (data.selectedClassId) {
    Store.setSelectedClassId(data.selectedClassId);
  }

  if (data?.isOnboarded) {
    const currentProfile = Store.getTeacherProfile() || {};
    Store.saveTeacherProfile({
      ...currentProfile,
      schoolLevel: data.schoolLevel || currentProfile.schoolLevel,
      selectedClassId: data.selectedClassId || null,
      teacherName: data.teacherName || data.displayName || currentProfile.teacherName || '',
      isOnboarded: true,
    });
  }
}

async function hydrateClassesFromFirestore() {
  const database = getDb();
  const uid = getCurrentUserId();
  if (!database || !uid) return;

  const classesRef = collection(database, 'users', uid, 'classes');
  const snap = await withTimeout(getDocs(classesRef), SYNC_TIMEOUT_MS, 'classes load');
  const classes = snap.docs.map(docItem =>
    normalizeClassFromSnapshot(docItem.id, docItem.data() || {})
  );

  if (classes.length > 0) {
    Store.saveClasses(classes);
    notifyStoreUpdated();
    return;
  }

  const localClasses = Store.getClasses();
  if (localClasses.length > 0) {
    await Promise.all(
      localClasses.map(cls =>
        syncClassToFirestore(cls).catch(error => {
          console.warn('[FirestoreSync] 초기 로컬 클래스 업로드 실패:', error);
        })
      )
    );
  }
}

function startRealtimeClassSync() {
  const database = getDb();
  const uid = getCurrentUserId();
  if (!database || !uid || unsubscribeClasses) return;

  const classesRef = collection(database, 'users', uid, 'classes');
  unsubscribeClasses = onSnapshot(
    classesRef,
    snapshot => {
      const classes = snapshot.docs.map(docItem =>
        normalizeClassFromSnapshot(docItem.id, docItem.data() || {})
      );
      Store.saveClasses(classes);
      notifyStoreUpdated();
    },
    error => {
      console.warn('[FirestoreSync] 실시간 클래스 동기화 실패:', error);
    }
  );
}

export async function init() {
  const uid = getCurrentUserId();
  if (!uid || currentUserId === uid) return;

  // 사용자 전환 감지 — 이전 사용자의 localStorage 데이터 완전 삭제
  const storedUid = localStorage.getItem(USER_ID_KEY);
  if (storedUid && storedUid !== uid) {
    console.log('[FirestoreSync] 사용자 변경 감지 — 이전 사용자 데이터 초기화');
    Store.clearAllData();
  }
  localStorage.setItem(USER_ID_KEY, uid);

  currentUserId = uid;
  const database = getDb();
  if (!database) return;

  await Promise.all([hydrateProfileFromFirestore(), hydrateClassesFromFirestore()]);
  startRealtimeClassSync();
}

export function stop() {
  if (unsubscribeClasses) {
    unsubscribeClasses();
    unsubscribeClasses = null;
  }
  currentUserId = null;
}

export async function syncTeacherProfileToFirestore(profile) {
  const database = getDb();
  const uid = getCurrentUserId();
  if (!database || !uid) return;

  const userRef = doc(database, 'users', uid);
  await withTimeout(
    setDoc(
      userRef,
      {
        ...profile,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    ),
    SYNC_TIMEOUT_MS,
    'teacher profile sync'
  );
}

export async function setSelectedClass(classId) {
  const database = getDb();
  const uid = getCurrentUserId();
  if (!database || !uid) return;

  const userRef = doc(database, 'users', uid);
  await withTimeout(
    setDoc(
      userRef,
      {
        selectedClassId: classId || null,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    ),
    SYNC_TIMEOUT_MS,
    'selectedClass sync'
  );
}

export const FirestoreSync = {
  init,
  stop,
  syncTeacherProfileToFirestore,
  setSelectedClass,
};
