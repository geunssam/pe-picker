/* ============================================
   PE Picker - Group Manager Repository
   모둠 배정 상태 관리
   ============================================ */

import { KEYS, get, set, remove } from './base-repo.js';

// === 현재 모둠 상태 ===

/**
 * 현재 모둠 가져오기
 * @returns {Array} 모둠 배열
 */
function getCurrentTeams() {
  return get(KEYS.CURRENT_TEAMS) || [];
}

/**
 * 현재 모둠 저장
 * @param {Array} teams - 모둠 배열
 */
function saveCurrentTeams(teams) {
  set(KEYS.CURRENT_TEAMS, teams);
}

/**
 * 현재 모둠 초기화
 */
function clearCurrentTeams() {
  remove(KEYS.CURRENT_TEAMS);
}

export const GroupManagerRepo = {
  getCurrentTeams,
  saveCurrentTeams,
  clearCurrentTeams,
};
