/* ============================================
   PE Picker - Store (Facade)
   모든 Repository 통합 인터페이스
   - 추후 Firebase 전환 시 각 repo만 교체
   ============================================ */

import { KEYS, get, set, generateId, clearAll } from '../storage/base-repo.js';
import { ClassRepo } from '../storage/class-repo.js';
import { TagGameRepo } from '../storage/tag-game-repo.js';
import { GroupManagerRepo } from '../storage/group-manager-repo.js';
import { SettingsRepo } from '../storage/settings-repo.js';
import { TeacherRepo } from '../storage/teacher-repo.js';
import { BadgeRepo } from '../storage/badge-repo.js';

// === 학급 관리 (ClassRepo) ===
function getClasses() {
  return ClassRepo.getAll();
}

function saveClasses(classes) {
  set(KEYS.CLASSES, classes);
}

function addClass(name, students, teamNames, teams, teamCount) {
  return ClassRepo.create(name, students, teamNames, teams, teamCount);
}

function updateClass(id, name, students, teamNames, teams, teamCount) {
  return ClassRepo.update(id, name, students, teamNames, teams, teamCount);
}

function deleteClass(id) {
  return ClassRepo.remove(id);
}

function getClassById(id) {
  return ClassRepo.getById(id);
}

function getSelectedClassId() {
  return ClassRepo.getSelectedId();
}

function setSelectedClassId(id) {
  return ClassRepo.setSelectedId(id);
}

function clearSelectedClass() {
  return ClassRepo.clearSelected();
}

function getSelectedClass() {
  return ClassRepo.getSelected();
}

// === 술래뽑기 (TagGameRepo) ===
function getTagGameData() {
  return TagGameRepo.getData();
}

function saveTagGameData(data) {
  return TagGameRepo.saveData(data);
}

function clearTagGameData() {
  return TagGameRepo.clear();
}

// === 모둠 관리 (GroupManagerRepo) ===
function getCurrentTeams() {
  return GroupManagerRepo.getCurrentTeams();
}

function saveCurrentTeams(teams) {
  return GroupManagerRepo.saveCurrentTeams(teams);
}

function clearCurrentTeams() {
  return GroupManagerRepo.clearCurrentTeams();
}

// === 배지 (BadgeRepo) ===
function addBadgeRecords(classId, students, badgeTypes, context, teamName) {
  return BadgeRepo.addBadgeRecords(classId, students, badgeTypes, context, teamName);
}

function getBadgeLogsByClass(classId) {
  return BadgeRepo.getBadgeLogsByClass(classId);
}

function getBadgeLogsByStudent(classId, studentId) {
  return BadgeRepo.getBadgeLogsByStudent(classId, studentId);
}

function getStudentBadgeCounts(classId, studentId) {
  return BadgeRepo.getStudentBadgeCounts(classId, studentId);
}

function getStudentXp(classId, studentId) {
  return BadgeRepo.getStudentXp(classId, studentId);
}

function getClassTotalBadges(classId) {
  return BadgeRepo.getClassTotalBadges(classId);
}

function getClassBadgeCounts(classId) {
  return BadgeRepo.getClassBadgeCounts(classId);
}

function getStudentRanking(classId, limit, badgeType) {
  return BadgeRepo.getStudentRanking(classId, limit, badgeType);
}

function getRecentBadgeLogs(classId, limit) {
  return BadgeRepo.getRecentBadgeLogs(classId, limit);
}

function getBadgeCountByPeriod(classId, from, to) {
  return BadgeRepo.getBadgeCountByPeriod(classId, from, to);
}

function getWeeklyBadgeCounts(classId, weeks) {
  return BadgeRepo.getWeeklyBadgeCounts(classId, weeks);
}

function getMonthlyBadgeCounts(classId, months) {
  return BadgeRepo.getMonthlyBadgeCounts(classId, months);
}

function getSemesterBadgeCounts(classId) {
  return BadgeRepo.getSemesterBadgeCounts(classId);
}

function getCustomRangeBadgeCounts(classId, from, to) {
  return BadgeRepo.getCustomRangeBadgeCounts(classId, from, to);
}

function clearBadgeLogs(classId) {
  return BadgeRepo.clearBadgeLogs(classId);
}

function removeBadgeLogsForStudents(classId, studentIds) {
  return BadgeRepo.removeBadgeLogsForStudents(classId, studentIds);
}

function syncBadgeStudentNames(classId, students) {
  return BadgeRepo.syncStudentNames(classId, students);
}

function getThermostatSettings(classId) {
  return BadgeRepo.getThermostatSettings(classId);
}

function saveThermostatSettings(classId, settings) {
  return BadgeRepo.saveThermostatSettings(classId, settings);
}

// === 설정 (SettingsRepo) ===
function getSettings() {
  return SettingsRepo.getAll();
}

function saveSettings(settings) {
  return SettingsRepo.save(settings);
}

function getDefaultTeamNames() {
  return SettingsRepo.getDefaultTeamNames();
}

function saveDefaultTeamNames(names) {
  return SettingsRepo.saveDefaultTeamNames(names);
}

// === 교사 프로필 (TeacherRepo) ===
function getTeacherProfile() {
  return TeacherRepo.getProfile();
}

function saveTeacherProfile(profile) {
  return TeacherRepo.saveProfile(profile);
}

function isTeacherOnboarded() {
  return TeacherRepo.isOnboarded();
}

// === 계정 전환/로그아웃 시 전체 초기화 ===
function clearAllData() {
  clearAll();
}

// === 마이그레이션 ===

/**
 * teamCount 필드 마이그레이션
 */
function migrateTeamCount() {
  const classes = getClasses();
  let changed = false;

  classes.forEach(c => {
    if (c.teamCount === undefined) {
      c.teamCount = c.teams && c.teams.length > 0 ? c.teams.length : 6;
      changed = true;
    }
  });

  if (changed) {
    saveClasses(classes);
  }
}

/**
 * groups→teams 필드 마이그레이션
 */
function migrateGroupsToTeams() {
  const classes = getClasses();
  let changed = false;

  classes.forEach(c => {
    if ('groupNames' in c && !('teamNames' in c)) {
      c.teamNames = c.groupNames;
      delete c.groupNames;
      changed = true;
    }
    if ('groups' in c && !('teams' in c)) {
      c.teams = c.groups;
      delete c.groups;
      changed = true;
    }
    if ('groupCount' in c && !('teamCount' in c)) {
      c.teamCount = c.groupCount;
      delete c.groupCount;
      changed = true;
    }
  });

  if (changed) {
    saveClasses(classes);
  }

  // 설정: defaultGroupNames→defaultTeamNames
  const settings = getSettings();
  if (settings?.defaultGroupNames && !settings.defaultTeamNames) {
    settings.defaultTeamNames = settings.defaultGroupNames;
    delete settings.defaultGroupNames;
    saveSettings(settings);
  }

  // localStorage 키: pet_current_groups → pet_current_teams
  const oldTeams = get('pet_current_groups');
  if (oldTeams && !get('pet_current_teams')) {
    set('pet_current_teams', oldTeams);
    localStorage.removeItem('pet_current_groups');
  }
}

/**
 * 학생 데이터 마이그레이션 (문자열 → 객체)
 */
function migrateStudentData() {
  const classes = getClasses();
  let changed = false;

  classes.forEach(cls => {
    cls.students = cls.students.map(student => {
      // 문자열인 경우 (레거시)
      if (typeof student === 'string') {
        changed = true;
        return {
          id: generateId(),
          name: student,
          number: 0,
          gender: '',
          team: '',
          sportsAbility: '',
          tags: [],
          note: '',
        };
      }

      // 기존 객체에 신규 필드 추가
      if (!student.id) {
        changed = true;
        return {
          id: generateId(),
          team: '',
          sportsAbility: '',
          tags: [],
          note: '',
          ...student,
        };
      }

      // 이미 확장된 구조인 경우 기본값 보장
      return {
        team: '',
        sportsAbility: '',
        tags: [],
        note: '',
        ...student,
      };
    });
  });

  if (changed) {
    saveClasses(classes);
  }
}

/**
 * 학급 ID 마이그레이션 (중복/누락 ID 보정)
 */
function migrateClassIds() {
  const classes = getClasses();
  const seenIds = new Set();
  const selectedId = getSelectedClassId();
  let selectedIdChanged = false;
  let changed = false;

  classes.forEach(cls => {
    const currentId = cls.id;
    const isInvalid = !currentId || seenIds.has(currentId);

    if (isInvalid) {
      const oldId = currentId;
      let nextId = generateId();
      while (seenIds.has(nextId)) {
        nextId = generateId();
      }

      cls.id = nextId;
      changed = true;

      if (!selectedIdChanged && selectedId && selectedId === oldId) {
        setSelectedClassId(nextId);
        selectedIdChanged = true;
      }
    }

    seenIds.add(cls.id);
  });

  if (changed) {
    saveClasses(classes);
  }
}

/**
 * 레거시 데이터 마이그레이션
 */
function migrateFromLegacy() {
  // 기존 class-group-manager 데이터
  const legacyClasses = get('cgm_classes');
  if (legacyClasses && !get(KEYS.CLASSES)) {
    set(KEYS.CLASSES, legacyClasses);
  }

  const legacyGroups = get('cgm_current_groups');
  if (legacyGroups && !get(KEYS.CURRENT_TEAMS)) {
    set(KEYS.CURRENT_TEAMS, legacyGroups);
  }

  const legacySettings = get('cgm_settings');
  if (legacySettings && !get(KEYS.SETTINGS)) {
    set(KEYS.SETTINGS, legacySettings);
  }

  // 기존 태그게임 데이터
  const legacyTag = get('tagGameData');
  if (legacyTag && !get(KEYS.TAG_GAME)) {
    set(KEYS.TAG_GAME, legacyTag);
  }

  // groups→teams 마이그레이션
  migrateGroupsToTeams();

  // teamCount 마이그레이션
  migrateTeamCount();

  // 학생 데이터 마이그레이션
  migrateStudentData();

  // 학급 ID 마이그레이션
  migrateClassIds();

  // 빈 이름 학생 → 배지 로그에서 이름 복구
  migrateRecoverStudentNames();

  // 무효 번호(0, NaN) 학생 → 자동 번호 배정
  migrateFixStudentNumbers();

  // 유령 학생(name이 빈 문자열) 제거 마이그레이션
  migrateRemoveGhostStudents();

  // 번호 중복 학생 제거 마이그레이션 (일괄등록 id 유실 버그 대응)
  migrateDeduplicateStudents();
}

/**
 * 빈 이름 학생 복구 마이그레이션
 * 배지 로그에 남아 있는 studentName으로 이름 복구
 */
function migrateRecoverStudentNames() {
  const classes = getClasses();
  let changed = false;

  classes.forEach(cls => {
    if (!Array.isArray(cls.students)) return;
    cls.students.forEach(s => {
      if (typeof s !== 'object') return;
      if (s.name && s.name.trim()) return; // 이름 있으면 패스
      const logs = BadgeRepo.getBadgeLogsByStudent(cls.id, s.id);
      const logName = logs.find(l => l.studentName)?.studentName;
      if (logName) {
        s.name = logName;
        changed = true;
      }
    });
  });

  if (changed) {
    saveClasses(classes);
  }
}

/**
 * 무효 번호 보정 마이그레이션
 * number <= 0 또는 NaN인 학생에게 자동 번호 배정
 */
function migrateFixStudentNumbers() {
  const classes = getClasses();
  let changed = false;

  classes.forEach(cls => {
    if (!Array.isArray(cls.students)) return;
    const usedNums = cls.students
      .map(s => (typeof s === 'object' ? parseInt(s.number, 10) : NaN))
      .filter(n => Number.isFinite(n) && n > 0);
    let maxNum = usedNums.length > 0 ? Math.max(...usedNums) : 0;

    cls.students.forEach(s => {
      if (typeof s !== 'object') return;
      const num = parseInt(s.number, 10);
      if (!Number.isFinite(num) || num <= 0) {
        maxNum++;
        s.number = maxNum;
        changed = true;
      }
    });
  });

  if (changed) {
    saveClasses(classes);
  }
}

/**
 * 유령 학생 제거 마이그레이션
 * 위저드에서 name: '' 으로 생성된 빈 학생 객체를 정리
 */
function migrateRemoveGhostStudents() {
  const classes = getClasses();
  let changed = false;

  classes.forEach(cls => {
    if (!Array.isArray(cls.students)) return;
    const before = cls.students.length;
    cls.students = cls.students.filter(s => {
      if (typeof s === 'string') return s.trim().length > 0;
      return (s.name || '').trim().length > 0;
    });
    if (cls.students.length !== before) changed = true;
  });

  if (changed) {
    saveClasses(classes);
  }
}

/**
 * 번호 중복 학생 제거 마이그레이션
 * 일괄등록 시 id가 유실되어 같은 번호의 학생이 2명씩 생긴 경우 정리
 * 동일 번호+이름이면 중복으로 판단, 배지/XP가 더 많은 쪽을 보존
 */
function migrateDeduplicateStudents() {
  const classes = getClasses();
  let changed = false;

  classes.forEach(cls => {
    if (!Array.isArray(cls.students)) return;

    const seen = new Map(); // key: "number|name" → best student
    const deduped = [];

    for (const s of cls.students) {
      const name = (s.name || '').trim();
      if (!name) continue;

      const key = `${s.number}|${name}`;
      if (seen.has(key)) {
        // 중복 발견 — 배지/XP가 더 많은 쪽 보존
        const existing = seen.get(key);
        const existingBadges = Array.isArray(existing.badges) ? existing.badges.length : 0;
        const currentBadges = Array.isArray(s.badges) ? s.badges.length : 0;

        if (currentBadges > existingBadges || (s.xp || 0) > (existing.xp || 0)) {
          // 현재 학생이 더 많은 데이터 보유 → 교체
          const idx = deduped.indexOf(existing);
          if (idx !== -1) deduped[idx] = s;
          seen.set(key, s);
        }
        changed = true;
      } else {
        seen.set(key, s);
        deduped.push(s);
      }
    }

    if (deduped.length !== cls.students.length) {
      cls.students = deduped;
    }
  });

  if (changed) {
    saveClasses(classes);
  }
}

// Public API (기존 인터페이스 유지)
export const Store = {
  // 학급
  getClasses,
  saveClasses,
  addClass,
  updateClass,
  deleteClass,
  getClassById,
  // 선택된 학급
  getSelectedClassId,
  setSelectedClassId,
  clearSelectedClass,
  getSelectedClass,
  // 술래뽑기
  getTagGameData,
  saveTagGameData,
  clearTagGameData,
  // 모둠
  getCurrentTeams,
  saveCurrentTeams,
  clearCurrentTeams,
  // 설정
  getSettings,
  saveSettings,
  getDefaultTeamNames,
  saveDefaultTeamNames,
  // 배지
  addBadgeRecords,
  getBadgeLogsByClass,
  getBadgeLogsByStudent,
  getStudentBadgeCounts,
  getStudentXp,
  getClassTotalBadges,
  getClassBadgeCounts,
  getStudentRanking,
  getRecentBadgeLogs,
  getBadgeCountByPeriod,
  getWeeklyBadgeCounts,
  getMonthlyBadgeCounts,
  getSemesterBadgeCounts,
  getCustomRangeBadgeCounts,
  clearBadgeLogs,
  removeBadgeLogsForStudents,
  syncBadgeStudentNames,
  getThermostatSettings,
  saveThermostatSettings,
  // 교사 프로필
  getTeacherProfile,
  saveTeacherProfile,
  isTeacherOnboarded,
  // 초기화
  clearAllData,
  // 마이그레이션
  migrateFromLegacy,
};
