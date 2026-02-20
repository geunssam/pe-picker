import { Store } from './shared/store.js';
import { AuthManager } from './auth-manager.js';
import { getFirestoreInstance } from './firebase-config.js';
import { withTimeout } from './shared/promise-utils.js';
import {
  syncClassToFirestore,
  hydrateStudentsFromFirestore,
} from './class-management/class-firestore.js';
import { decodeTeamsFromFirestore } from './shared/firestore-utils.js';
import { generateId } from './storage/base-repo.js';
import { BadgeRepo } from './storage/badge-repo.js';
import { XP_PER_BADGE } from './badge-manager/badge-config.js';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  setDoc,
  writeBatch,
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

/**
 * 클래스 문서의 학생 배열 + 서브컬렉션의 badges/xp를 병합
 * - 클래스 문서의 students 배열이 전체 명단의 출처 (source of truth)
 * - 서브컬렉션은 badges/xp 데이터만 오버레이
 */
function mergeStudentsWithSubcollection(docStudents, subStudents) {
  if (!subStudents || subStudents.length === 0) return docStudents;
  if (!docStudents || docStudents.length === 0) return subStudents;

  // 서브컬렉션이 전체 명단을 커버하면 그대로 사용
  if (subStudents.length >= docStudents.length) return subStudents;

  // 부분 서브컬렉션: 클래스 문서 명단 기반 + 서브컬렉션의 badges/xp 병합
  const subMap = new Map(subStudents.map(s => [s.id, s]));
  return docStudents.map(ds => {
    const sub = subMap.get(ds.id);
    if (sub) {
      return {
        ...ds,
        badges: sub.badges || [],
        xp: sub.xp || 0,
      };
    }
    return ds;
  });
}

function normalizeClassFromSnapshot(classId, data = {}, subStudents = null) {
  const docStudents = Array.isArray(data.students)
    ? data.students.map((student, idx) => normalizeStudent(student, idx + 1))
    : [];

  const safeStudents = mergeStudentsWithSubcollection(docStudents, subStudents).map((s, idx) =>
    normalizeStudent(s, idx + 1)
  );

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
    thermostat: data.thermostat || null,
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

  if (snap.docs.length > 0) {
    // 각 학급의 학생 서브컬렉션도 함께 읽기 (badges/xp 오버레이용)
    const classes = await Promise.all(
      snap.docs.map(async docItem => {
        const data = docItem.data() || {};
        const subStudents = await hydrateStudentsFromFirestore(docItem.id);
        return normalizeClassFromSnapshot(docItem.id, data, subStudents);
      })
    );

    Store.saveClasses(classes);

    // 학생 서브컬렉션에서 badges/xp를 읽어 BadgeRepo에 반영
    hydrateBadgesFromStudents(classes);

    // thermostat 필드를 BadgeRepo에 반영
    hydrateThermostatFromClasses(classes);

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

/**
 * 학생 서브컬렉션의 badges → BadgeRepo의 badgeLogs 형식으로 변환
 */
function hydrateBadgesFromStudents(classes) {
  const allLogs = [];

  for (const cls of classes) {
    for (const student of cls.students) {
      if (!Array.isArray(student.badges) || student.badges.length === 0) continue;

      for (const badge of student.badges) {
        allLogs.push({
          id: badge.id || generateId('badge'),
          timestamp: badge.date || new Date().toISOString(),
          classId: cls.id,
          studentId: student.id,
          studentName: student.name,
          badgeType: badge.type,
          xp: badge.xp || XP_PER_BADGE,
          context: badge.context || 'badge-collection',
          team: badge.team || '',
        });
      }
    }
  }

  if (allLogs.length > 0) {
    // Firestore 데이터를 로컬에 반영 (기존 로컬 로그보다 우선)
    BadgeRepo.saveBadgeLogs(allLogs);
  } else {
    // 로컬에 있으면 클라우드로 업로드 (최초 마이그레이션)
    const localLogs = BadgeRepo.getBadgeLogs();
    if (localLogs.length > 0) {
      syncBadgesToStudentDocs(classes).catch(err =>
        console.warn('[FirestoreSync] 배지 초기 업로드 실패:', err)
      );
    }
  }
}

/**
 * 학급 문서의 thermostat 필드 → BadgeRepo에 반영
 */
function hydrateThermostatFromClasses(classes) {
  for (const cls of classes) {
    if (cls.thermostat) {
      BadgeRepo.saveThermostatSettings(cls.id, cls.thermostat);
    }
  }
}

function startRealtimeClassSync() {
  const database = getDb();
  const uid = getCurrentUserId();
  if (!database || !uid || unsubscribeClasses) return;

  const classesRef = collection(database, 'users', uid, 'classes');
  unsubscribeClasses = onSnapshot(
    classesRef,
    async snapshot => {
      const classes = await Promise.all(
        snapshot.docs.map(async docItem => {
          const data = docItem.data() || {};
          const subStudents = await hydrateStudentsFromFirestore(docItem.id);
          return normalizeClassFromSnapshot(docItem.id, data, subStudents);
        })
      );
      Store.saveClasses(classes);
      hydrateBadgesFromStudents(classes);
      hydrateThermostatFromClasses(classes);
      notifyStoreUpdated();
      window.dispatchEvent(new CustomEvent('badge-updated'));
    },
    error => {
      console.warn('[FirestoreSync] 실시간 클래스 동기화 실패:', error);
    }
  );
}

/**
 * 배지 데이터를 학생 서브컬렉션의 badges 배열 + xp로 동기화
 * @param {Array} classes - 학급 배열 (없으면 Store에서 가져옴)
 */
async function syncBadgesToStudentDocs(classes) {
  const database = getDb();
  const uid = getCurrentUserId();
  if (!database || !uid) return;

  const targetClasses = classes || Store.getClasses();
  const allLogs = BadgeRepo.getBadgeLogs();

  // classId → studentId → badges 맵 구성
  const classStudentBadgeMap = {};
  for (const log of allLogs) {
    if (!classStudentBadgeMap[log.classId]) {
      classStudentBadgeMap[log.classId] = {};
    }
    if (!classStudentBadgeMap[log.classId][log.studentId]) {
      classStudentBadgeMap[log.classId][log.studentId] = { badges: [], xp: 0 };
    }
    classStudentBadgeMap[log.classId][log.studentId].badges.push({
      id: log.id,
      type: log.badgeType,
      date: log.timestamp,
      context: log.context || 'badge-collection',
      team: log.team || '',
      xp: log.xp || XP_PER_BADGE,
    });
    classStudentBadgeMap[log.classId][log.studentId].xp += log.xp || XP_PER_BADGE;
  }

  for (const cls of targetClasses) {
    const studentMap = classStudentBadgeMap[cls.id];
    if (!studentMap) continue;

    try {
      const batch = writeBatch(database);
      let count = 0;

      for (const [studentId, data] of Object.entries(studentMap)) {
        const ref = doc(database, 'users', uid, 'classes', cls.id, 'students', studentId);
        batch.set(ref, { badges: data.badges, xp: data.xp }, { merge: true });
        count++;
      }

      if (count > 0) {
        await withTimeout(batch.commit(), SYNC_TIMEOUT_MS, 'badge batch sync');
        console.log('[FirestoreSync] 배지 동기화:', cls.id, count, '명');
      }
    } catch (error) {
      console.error('[FirestoreSync] 배지 동기화 실패:', cls.id, error);
    }
  }
}

/**
 * 새 배지 엔트리들을 해당 학생 문서에 추가
 * @param {Array} logEntries - 새로 생성된 배지 로그 배열
 */
export async function syncBadgeLogEntries(logEntries) {
  const database = getDb();
  const uid = getCurrentUserId();
  if (!database || !uid || !logEntries?.length) return;

  // classId → studentId → newBadges 그룹핑
  const grouped = {};
  for (const entry of logEntries) {
    const key = `${entry.classId}|${entry.studentId}`;
    if (!grouped[key]) {
      grouped[key] = { classId: entry.classId, studentId: entry.studentId, badges: [], xpDelta: 0 };
    }
    grouped[key].badges.push({
      id: entry.id,
      type: entry.badgeType,
      date: entry.timestamp,
      context: entry.context || 'badge-collection',
      team: entry.team || '',
      xp: entry.xp || XP_PER_BADGE,
    });
    grouped[key].xpDelta += entry.xp || XP_PER_BADGE;
  }

  try {
    for (const group of Object.values(grouped)) {
      const ref = doc(
        database,
        'users',
        uid,
        'classes',
        group.classId,
        'students',
        group.studentId
      );

      // 기존 문서 읽기 → badges 배열에 추가
      const snap = await withTimeout(getDoc(ref), SYNC_TIMEOUT_MS, 'student doc read');
      const existing = snap.exists() ? snap.data() : {};
      const existingBadges = Array.isArray(existing.badges) ? existing.badges : [];
      const existingXp = parseInt(existing.xp, 10) || 0;

      await withTimeout(
        setDoc(
          ref,
          {
            badges: [...existingBadges, ...group.badges],
            xp: existingXp + group.xpDelta,
          },
          { merge: true }
        ),
        SYNC_TIMEOUT_MS,
        'student badge update'
      );
    }
    console.log('[FirestoreSync] 배지 엔트리 동기화 성공:', logEntries.length, '건');
  } catch (error) {
    console.error('[FirestoreSync] 배지 엔트리 동기화 실패:', error);
  }
}

/**
 * 온도계 설정을 클래스 문서의 thermostat 필드에 merge
 */
export async function syncThermostatToFirestore(classId, settings) {
  const database = getDb();
  const uid = getCurrentUserId();
  if (!database || !uid) return;

  try {
    const ref = doc(database, 'users', uid, 'classes', classId);
    await withTimeout(
      setDoc(ref, { thermostat: settings }, { merge: true }),
      SYNC_TIMEOUT_MS,
      'thermostat sync'
    );
  } catch (error) {
    console.warn('[FirestoreSync] 온도계 설정 동기화 실패:', error);
  }
}

export async function init() {
  const uid = getCurrentUserId();
  if (!uid || currentUserId === uid) return;

  // 사용자 전환 감지 — 저장된 UID와 다르면 (또는 없으면) 무조건 초기화
  const storedUid = localStorage.getItem(USER_ID_KEY);
  if (storedUid !== uid) {
    console.log('[FirestoreSync] 사용자 변경 감지 — localStorage 초기화');
    Store.clearAllData();
  }
  localStorage.setItem(USER_ID_KEY, uid);

  currentUserId = uid;
  const database = getDb();
  if (!database) return;

  // 하이드레이션 순서: 프로필 → 클래스 (학생 서브컬렉션 + 배지/온도계 포함)
  await hydrateProfileFromFirestore();
  await hydrateClassesFromFirestore();

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
  syncBadgeLogEntries,
  syncThermostatToFirestore,
};
