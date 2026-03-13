/* ============================================
   PE Picker - Group Manager Repository
   모둠 배정 상태 관리 (학급별 키 분리)
   ============================================ */

import { KEYS, get, set, remove } from './base-repo.js';

// === 현재 모둠 상태 ===

/**
 * 현재 모둠 가져오기
 * @param {string} classId - 학급 ID
 * @returns {Array} 모둠 배열
 */
function getCurrentTeams(classId) {
  if (!classId) return [];
  return get(`${KEYS.CURRENT_TEAMS}_${classId}`) || [];
}

/**
 * 현재 모둠 저장
 * @param {string} classId - 학급 ID
 * @param {Array} teams - 모둠 배열
 */
function saveCurrentTeams(classId, teams) {
  if (!classId) return;
  set(`${KEYS.CURRENT_TEAMS}_${classId}`, teams);
}

/**
 * 현재 모둠 초기화
 * @param {string} classId - 학급 ID
 */
function clearCurrentTeams(classId) {
  if (!classId) return;
  remove(`${KEYS.CURRENT_TEAMS}_${classId}`);
}

export const GroupManagerRepo = {
  getCurrentTeams,
  saveCurrentTeams,
  clearCurrentTeams,
};
