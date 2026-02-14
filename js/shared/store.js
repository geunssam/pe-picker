/* ============================================
   PE Picker - Store (Facade)
   모든 Repository 통합 인터페이스
   - 추후 Firebase 전환 시 각 repo만 교체
   ============================================ */

import { KEYS, get, set, generateId } from '../storage/base-repo.js';
import { ClassRepo } from '../storage/class-repo.js';
import { TagGameRepo } from '../storage/tag-game-repo.js';
import { GroupManagerRepo } from '../storage/group-manager-repo.js';
import { SettingsRepo } from '../storage/settings-repo.js';
import { TeacherRepo } from '../storage/teacher-repo.js';

// === 학급 관리 (ClassRepo) ===
function getClasses() {
  return ClassRepo.getAll();
}

function saveClasses(classes) {
  set(KEYS.CLASSES, classes);
}

function addClass(name, students, groupNames, groups, groupCount) {
  return ClassRepo.create(name, students, groupNames, groups, groupCount);
}

function updateClass(id, name, students, groupNames, groups, groupCount) {
  return ClassRepo.update(id, name, students, groupNames, groups, groupCount);
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
function getCurrentGroups() {
  return GroupManagerRepo.getCurrentGroups();
}

function saveCurrentGroups(groups) {
  return GroupManagerRepo.saveCurrentGroups(groups);
}

function clearCurrentGroups() {
  return GroupManagerRepo.clearCurrentGroups();
}

// === 쿠키 (GroupManagerRepo) ===
function getCookieHistory() {
  return GroupManagerRepo.getCookieHistory();
}

function addCookieRecord(classId, groups) {
  return GroupManagerRepo.addCookieRecord(classId, groups);
}

function getCookieHistoryByClass(classId) {
  return GroupManagerRepo.getCookieHistoryByClass(classId);
}

function getCookieStats(classId) {
  return GroupManagerRepo.getCookieStats(classId);
}

function clearCookieHistory(classId) {
  return GroupManagerRepo.clearCookieHistory(classId);
}

// === 설정 (SettingsRepo) ===
function getSettings() {
  return SettingsRepo.getAll();
}

function saveSettings(settings) {
  return SettingsRepo.save(settings);
}

function getDefaultGroupNames() {
  return SettingsRepo.getDefaultGroupNames();
}

function saveDefaultGroupNames(names) {
  return SettingsRepo.saveDefaultGroupNames(names);
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

// === 마이그레이션 ===

/**
 * groupCount 필드 마이그레이션
 */
function migrateGroupCount() {
  const classes = getClasses();
  let changed = false;

  classes.forEach(c => {
    if (c.groupCount === undefined) {
      c.groupCount = c.groups && c.groups.length > 0 ? c.groups.length : 6;
      changed = true;
    }
  });

  if (changed) {
    saveClasses(classes);
    console.log('[Store] groupCount 마이그레이션 완료');
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
          sportsAbility: '',
          tags: [],
          note: '',
          ...student,
        };
      }

      // 이미 확장된 구조인 경우 기본값 보장
      return {
        sportsAbility: '',
        tags: [],
        note: '',
        ...student,
      };
    });
  });

  if (changed) {
    saveClasses(classes);
    console.log('[Store] 학생 데이터 마이그레이션 완료');
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
    console.log('[Store] classId 마이그레이션 완료');
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
    console.log('[Store] cgm_classes 마이그레이션 완료');
  }

  const legacyGroups = get('cgm_current_groups');
  if (legacyGroups && !get(KEYS.CURRENT_GROUPS)) {
    set(KEYS.CURRENT_GROUPS, legacyGroups);
  }

  const legacySettings = get('cgm_settings');
  if (legacySettings && !get(KEYS.SETTINGS)) {
    set(KEYS.SETTINGS, legacySettings);
  }

  const legacyCookies = get('cgm_cookie_history');
  if (legacyCookies && !get(KEYS.COOKIE_HISTORY)) {
    set(KEYS.COOKIE_HISTORY, legacyCookies);
  }

  // 기존 태그게임 데이터
  const legacyTag = get('tagGameData');
  if (legacyTag && !get(KEYS.TAG_GAME)) {
    set(KEYS.TAG_GAME, legacyTag);
    console.log('[Store] tagGameData 마이그레이션 완료');
  }

  // groupCount 마이그레이션
  migrateGroupCount();

  // 학생 데이터 마이그레이션
  migrateStudentData();

  // 학급 ID 마이그레이션
  migrateClassIds();
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
  getCurrentGroups,
  saveCurrentGroups,
  clearCurrentGroups,
  // 설정
  getSettings,
  saveSettings,
  getDefaultGroupNames,
  saveDefaultGroupNames,
  // 쿠키
  getCookieHistory,
  addCookieRecord,
  getCookieHistoryByClass,
  getCookieStats,
  clearCookieHistory,
  // 교사 프로필
  getTeacherProfile,
  saveTeacherProfile,
  isTeacherOnboarded,
  // 마이그레이션
  migrateFromLegacy,
};
