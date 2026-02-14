/* ============================================
   PE Picker - Tag Game Repository
   술래뽑기 상태 관리
   ============================================ */

import { KEYS, get, set, remove } from './base-repo.js';

/**
 * 술래뽑기 상태 가져오기
 * @returns {Object|null} 게임 상태 또는 null
 */
function getData() {
  return get(KEYS.TAG_GAME) || null;
}

/**
 * 술래뽑기 상태 저장
 * @param {Object} data - 게임 상태
 */
function saveData(data) {
  set(KEYS.TAG_GAME, {
    ...data,
    lastUpdated: new Date().toISOString(),
  });
}

/**
 * 술래뽑기 상태 초기화
 */
function clearData() {
  remove(KEYS.TAG_GAME);
}

export const TagGameRepo = {
  getData,
  saveData,
  clear: clearData,
};
