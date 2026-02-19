/* ============================================
   PE Picker - Badge Repository
   배지 로그 & 온도계 설정 localStorage CRUD
   ============================================ */

import { KEYS, get, set, generateId } from './base-repo.js';
import { XP_PER_BADGE, DEFAULT_THERMOSTAT } from '../badge-manager/badge-config.js';

// === 배지 로그 ===

/**
 * 전체 배지 로그 가져오기
 * @returns {Array} 배지 로그 배열
 */
function getBadgeLogs() {
  return get(KEYS.BADGE_LOG) || [];
}

/**
 * 배지 로그 저장
 * @param {Array} logs - 배지 로그 배열
 */
function saveBadgeLogs(logs) {
  set(KEYS.BADGE_LOG, logs);
}

/**
 * 배지 기록 추가 (여러 학생 × 여러 배지)
 * @param {string} classId - 학급 ID
 * @param {Array<{id: string, name: string}>} students - 학생 배열
 * @param {Array<string>} badgeTypes - 배지 타입 키 배열
 * @param {string} context - 부여 맥락 ('tag-game'|'group-manager'|'badge-collection')
 * @returns {number} 추가된 배지 수
 */
function addBadgeRecords(classId, students, badgeTypes, context) {
  const logs = getBadgeLogs();
  const timestamp = new Date().toISOString();
  const newEntries = [];

  for (const student of students) {
    for (const badgeType of badgeTypes) {
      const entry = {
        id: generateId('badge'),
        timestamp,
        classId,
        studentId: student.id,
        studentName: student.name,
        badgeType,
        xp: XP_PER_BADGE,
        context,
      };
      logs.push(entry);
      newEntries.push(entry);
    }
  }

  saveBadgeLogs(logs);
  return { count: newEntries.length, newEntries };
}

/**
 * 특정 학급의 배지 로그 가져오기
 * @param {string} classId - 학급 ID
 * @returns {Array}
 */
function getBadgeLogsByClass(classId) {
  return getBadgeLogs().filter(log => log.classId === classId);
}

/**
 * 특정 학생의 배지 로그 가져오기
 * @param {string} classId - 학급 ID
 * @param {string} studentId - 학생 ID
 * @returns {Array}
 */
function getBadgeLogsByStudent(classId, studentId) {
  return getBadgeLogs().filter(log => log.classId === classId && log.studentId === studentId);
}

/**
 * 학생별 배지 통계 (타입별 개수)
 * @param {string} classId - 학급 ID
 * @param {string} studentId - 학생 ID
 * @returns {Object} { cooperation: 3, respect: 2, ... }
 */
function getStudentBadgeCounts(classId, studentId) {
  const logs = getBadgeLogsByStudent(classId, studentId);
  const counts = {};
  for (const log of logs) {
    counts[log.badgeType] = (counts[log.badgeType] || 0) + 1;
  }
  return counts;
}

/**
 * 학생별 총 XP 계산
 * @param {string} classId - 학급 ID
 * @param {string} studentId - 학생 ID
 * @returns {number}
 */
function getStudentXp(classId, studentId) {
  const logs = getBadgeLogsByStudent(classId, studentId);
  return logs.reduce((sum, log) => sum + (log.xp || XP_PER_BADGE), 0);
}

/**
 * 학급 전체 배지 수
 * @param {string} classId - 학급 ID
 * @returns {number}
 */
function getClassTotalBadges(classId) {
  return getBadgeLogsByClass(classId).length;
}

/**
 * 학급 배지 타입별 통계
 * @param {string} classId - 학급 ID
 * @returns {Object} { cooperation: 24, respect: 18, ... }
 */
function getClassBadgeCounts(classId) {
  const logs = getBadgeLogsByClass(classId);
  const counts = {};
  for (const log of logs) {
    counts[log.badgeType] = (counts[log.badgeType] || 0) + 1;
  }
  return counts;
}

/**
 * 학생별 배지 순위 (TOP N)
 * @param {string} classId - 학급 ID
 * @param {number} [limit=5] - 상위 N명
 * @returns {Array<{studentId: string, studentName: string, count: number}>}
 */
function getStudentRanking(classId, limit = 5) {
  const logs = getBadgeLogsByClass(classId);
  const map = {};

  for (const log of logs) {
    if (!map[log.studentId]) {
      map[log.studentId] = { studentId: log.studentId, studentName: log.studentName, count: 0 };
    }
    map[log.studentId].count++;
  }

  return Object.values(map)
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

/**
 * 배지 로그 초기화
 * @param {string} [classId] - 학급 ID (없으면 전체 삭제)
 */
function clearBadgeLogs(classId) {
  if (classId) {
    const logs = getBadgeLogs().filter(log => log.classId !== classId);
    saveBadgeLogs(logs);
  } else {
    set(KEYS.BADGE_LOG, []);
  }
}

// === 온도계 설정 ===

/**
 * 온도계 설정 전체 가져오기
 * @returns {Object} classId → thermostat
 */
function getAllThermostatSettings() {
  return get(KEYS.THERMOSTAT) || {};
}

/**
 * 특정 학급 온도계 설정 가져오기
 * @param {string} classId - 학급 ID
 * @returns {Object}
 */
function getThermostatSettings(classId) {
  const all = getAllThermostatSettings();
  return all[classId] || { ...DEFAULT_THERMOSTAT };
}

/**
 * 온도계 설정 저장
 * @param {string} classId - 학급 ID
 * @param {Object} settings - 온도계 설정
 */
function saveThermostatSettings(classId, settings) {
  const all = getAllThermostatSettings();
  all[classId] = settings;
  set(KEYS.THERMOSTAT, all);
}

export const BadgeRepo = {
  getBadgeLogs,
  saveBadgeLogs,
  addBadgeRecords,
  getBadgeLogsByClass,
  getBadgeLogsByStudent,
  getStudentBadgeCounts,
  getStudentXp,
  getClassTotalBadges,
  getClassBadgeCounts,
  getStudentRanking,
  clearBadgeLogs,
  getAllThermostatSettings,
  getThermostatSettings,
  saveThermostatSettings,
};
