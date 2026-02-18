/* ============================================
   PE Picker - Class Repository
   학급 데이터 관리 (CRUD)
   ============================================ */

import { KEYS, get, set, remove, generateId } from './base-repo.js';
import { SettingsRepo } from './settings-repo.js';

/**
 * 모든 학급 가져오기
 * @returns {Array} 학급 배열
 */
function getAll() {
  return get(KEYS.CLASSES) || [];
}

/**
 * 학급 ID로 조회
 * @param {string} id - 학급 ID
 * @returns {Object|null} 학급 객체 또는 null
 */
function getById(id) {
  return getAll().find(c => c.id === id) || null;
}

/**
 * 학급 추가
 * @param {string} name - 학급명
 * @param {Array} students - 학생 배열
 * @param {Array} [teamNames] - 모둠명 배열
 * @param {Array} [teams] - 모둠 배열
 * @param {number} [teamCount=6] - 모둠 수
 * @returns {Object} 생성된 학급 객체
 */
function create(name, students, teamNames = null, teams = null, teamCount = 6) {
  const classes = getAll();
  const defaultNames = SettingsRepo.getDefaultTeamNames();

  const newClass = {
    // Date.now() 단독 사용 시 같은 ms에 생성된 학급 ID가 충돌할 수 있음
    id: generateId(),
    name,
    students,
    teamNames: teamNames || defaultNames.slice(0, teamCount),
    teams: teams || [],
    teamCount,
    createdAt: new Date().toISOString(),
  };

  classes.push(newClass);
  set(KEYS.CLASSES, classes);
  return newClass;
}

/**
 * 학급 수정
 * @param {string} id - 학급 ID
 * @param {string} name - 학급명
 * @param {Array} students - 학생 배열
 * @param {Array} [teamNames] - 모둠명 배열
 * @param {Array} [teams] - 모둠 배열
 * @param {number} [teamCount] - 모둠 수
 * @returns {Object|null} 수정된 학급 또는 null
 */
function update(id, name, students, teamNames = null, teams = null, teamCount = null) {
  const classes = getAll();
  const idx = classes.findIndex(c => c.id === id);
  if (idx === -1) return null;

  const updated = { ...classes[idx], name, students };
  if (teamNames !== null) updated.teamNames = teamNames;
  if (teams !== null) updated.teams = teams;
  if (teamCount !== null) updated.teamCount = teamCount;

  classes[idx] = updated;
  set(KEYS.CLASSES, classes);
  return classes[idx];
}

/**
 * 학급 삭제
 * @param {string} id - 학급 ID
 */
function removeClass(id) {
  const classes = getAll().filter(c => c.id !== id);
  set(KEYS.CLASSES, classes);
}

/**
 * 선택된 학급 ID 가져오기
 * @returns {string|null} 학급 ID 또는 null
 */
function getSelectedId() {
  return get(KEYS.SELECTED_CLASS) || null;
}

/**
 * 선택된 학급 ID 설정
 * @param {string} id - 학급 ID
 */
function setSelectedId(id) {
  set(KEYS.SELECTED_CLASS, id);
}

/**
 * 선택된 학급 해제
 */
function clearSelected() {
  remove(KEYS.SELECTED_CLASS);
}

/**
 * 선택된 학급 객체 가져오기
 * @returns {Object|null} 학급 객체 또는 null
 */
function getSelected() {
  const id = getSelectedId();
  return id ? getById(id) : null;
}

export const ClassRepo = {
  getAll,
  getById,
  create,
  update,
  remove: removeClass,
  getSelectedId,
  setSelectedId,
  clearSelected,
  getSelected,
};
