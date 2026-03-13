/* ============================================
   PE Picker - Tag Game Repository
   술래뽑기 상태 관리 (학급별 키 분리)
   ============================================ */

import { KEYS, get, set, remove } from './base-repo.js';

/**
 * 술래뽑기 상태 가져오기
 * @param {string} classId - 학급 ID
 * @returns {Object|null} 게임 상태 또는 null
 */
function getData(classId) {
  if (!classId) return null;
  return get(`${KEYS.TAG_GAME}_${classId}`) || null;
}

/**
 * 술래뽑기 상태 저장
 * @param {string} classId - 학급 ID
 * @param {Object} data - 게임 상태
 */
function saveData(classId, data) {
  if (!classId) return;
  set(`${KEYS.TAG_GAME}_${classId}`, {
    ...data,
    lastUpdated: new Date().toISOString(),
  });
}

/**
 * 술래뽑기 상태 초기화
 * @param {string} classId - 학급 ID
 */
function clearData(classId) {
  if (!classId) return;
  remove(`${KEYS.TAG_GAME}_${classId}`);
}

export const TagGameRepo = {
  getData,
  saveData,
  clear: clearData,
};
