/* ============================================
   PE Picker - Badge Repository
   배지 로그 & 온도계 설정 localStorage CRUD
   ============================================ */

import { KEYS, get, set, generateId } from './base-repo.js';
import { XP_PER_BADGE, DEFAULT_THERMOSTAT } from '../features/badge/badge-config.js';

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
function addBadgeRecords(classId, students, badgeTypes, context, teamName) {
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
        team: teamName || student.team || '',
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
function getStudentRanking(classId, limit = 5, badgeType = null) {
  let logs = getBadgeLogsByClass(classId);
  if (badgeType) logs = logs.filter(log => log.badgeType === badgeType);
  const map = {};

  for (const log of logs) {
    if (!map[log.studentId]) {
      map[log.studentId] = { studentId: log.studentId, studentName: log.studentName, count: 0 };
    }
    map[log.studentId].count++;
  }

  const sorted = Object.values(map).sort((a, b) => b.count - a.count);
  return limit > 0 ? sorted.slice(0, limit) : sorted;
}

/**
 * 학급 최근 배지 로그 (시간 역순)
 * @param {string} classId - 학급 ID
 * @param {number} [limit=10] - 가져올 개수
 * @returns {Array}
 */
function getRecentBadgeLogs(classId, limit = 10) {
  const logs = getBadgeLogsByClass(classId);
  return logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, limit);
}

/**
 * 학급 기간별 배지 수
 * @param {string} classId - 학급 ID
 * @param {Date} from - 시작 시간
 * @param {Date} to - 종료 시간
 * @returns {number}
 */
function getBadgeCountByPeriod(classId, from, to) {
  return getBadgeLogsByClass(classId).filter(log => {
    const d = new Date(log.timestamp);
    return d >= from && d < to;
  }).length;
}

/**
 * 최근 N주 주간 배지 수 배열
 * @param {string} classId
 * @param {number} [weeks=6]
 * @returns {Array<{label: string, count: number}>}
 */
function getWeeklyBadgeCounts(classId, weeks = 6) {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const thisMonday = new Date(now);
  thisMonday.setHours(0, 0, 0, 0);
  thisMonday.setDate(thisMonday.getDate() - mondayOffset);

  const result = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const from = new Date(thisMonday);
    from.setDate(from.getDate() - i * 7);
    const to = new Date(from);
    to.setDate(to.getDate() + 7);
    const end = i === 0 ? now : to;
    const count = getBadgeCountByPeriod(classId, from, end);
    const m = from.getMonth() + 1;
    const d = from.getDate();
    const label = i === 0 ? '이번 주' : `${m}/${d}`;
    result.push({ label, count, from, to: end });
  }
  return result;
}

/**
 * 최근 N개월 월간 배지 수 배열
 * @param {string} classId
 * @param {number} [months=6]
 * @returns {Array<{label: string, count: number}>}
 */
function getMonthlyBadgeCounts(classId, months = 6) {
  const now = new Date();
  const result = [];
  for (let i = months - 1; i >= 0; i--) {
    const from = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const to = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
    const end = i === 0 ? now : to;
    const count = getBadgeCountByPeriod(classId, from, end);
    const label = i === 0 ? '이번 달' : `${from.getMonth() + 1}월`;
    result.push({ label, count, from, to: end });
  }
  return result;
}

/**
 * 현재 학기 월별 배지 수 배열
 * 1학기: 3~8월 / 2학기: 9~2월
 * @param {string} classId
 * @returns {Array<{label: string, count: number}>}
 */
function getSemesterBadgeCounts(classId) {
  const now = new Date();
  const month = now.getMonth(); // 0-indexed
  let semesterStart;
  if (month >= 2 && month <= 7) {
    semesterStart = new Date(now.getFullYear(), 2, 1);
  } else if (month >= 8) {
    semesterStart = new Date(now.getFullYear(), 8, 1);
  } else {
    semesterStart = new Date(now.getFullYear() - 1, 8, 1);
  }

  const result = [];
  const cur = new Date(semesterStart);
  while (cur < now) {
    const from = new Date(cur);
    const nextMonth = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
    const to = nextMonth > now ? now : nextMonth;
    const count = getBadgeCountByPeriod(classId, from, to);
    const isCurrent =
      from.getMonth() === now.getMonth() && from.getFullYear() === now.getFullYear();
    const label = isCurrent ? '이번 달' : `${from.getMonth() + 1}월`;
    result.push({ label, count, from, to });
    cur.setMonth(cur.getMonth() + 1);
  }
  return result;
}

/**
 * 커스텀 기간 배지 수 배열 (자동 그루핑)
 * 14일 이하 → 일별 / 90일 이하 → 주별 / 그 외 → 월별
 * @param {string} classId
 * @param {Date} fromDate
 * @param {Date} toDate
 * @returns {Array<{label: string, count: number}>}
 */
function getCustomRangeBadgeCounts(classId, fromDate, toDate) {
  const diffDays = Math.ceil((toDate - fromDate) / 86400000);
  const result = [];

  if (diffDays <= 14) {
    // 일별
    const cur = new Date(fromDate);
    while (cur < toDate) {
      const from = new Date(cur);
      const to = new Date(cur);
      to.setDate(to.getDate() + 1);
      const end = to > toDate ? toDate : to;
      const count = getBadgeCountByPeriod(classId, from, end);
      result.push({ label: `${from.getMonth() + 1}/${from.getDate()}`, count, from, to: end });
      cur.setDate(cur.getDate() + 1);
    }
  } else if (diffDays <= 90) {
    // 주별
    const cur = new Date(fromDate);
    while (cur < toDate) {
      const from = new Date(cur);
      const to = new Date(cur);
      to.setDate(to.getDate() + 7);
      const end = to > toDate ? toDate : to;
      const count = getBadgeCountByPeriod(classId, from, end);
      result.push({ label: `${from.getMonth() + 1}/${from.getDate()}`, count, from, to: end });
      cur.setDate(cur.getDate() + 7);
    }
  } else {
    // 월별
    const cur = new Date(fromDate.getFullYear(), fromDate.getMonth(), 1);
    while (cur < toDate) {
      const from = new Date(cur);
      const nextMonth = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
      const to = nextMonth > toDate ? toDate : nextMonth;
      const actualFrom = from < fromDate ? fromDate : from;
      const count = getBadgeCountByPeriod(classId, actualFrom, to);
      result.push({ label: `${from.getMonth() + 1}월`, count, from: actualFrom, to });
      cur.setMonth(cur.getMonth() + 1);
    }
  }
  return result;
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

/**
 * 현재 학생 이름으로 배지 로그의 studentName을 동기화
 * @param {string} classId
 * @param {Array<{id: string, name: string}>} students
 */
function syncStudentNames(classId, students = []) {
  if (!classId || !Array.isArray(students) || students.length === 0) return;

  const nameById = new Map(
    students
      .filter(student => student?.id)
      .map(student => [student.id, (student.name || '').trim()])
      .filter(([, name]) => name)
  );

  if (nameById.size === 0) return;

  let changed = false;
  const nextLogs = getBadgeLogs().map(log => {
    if (log.classId !== classId) return log;

    const nextName = nameById.get(log.studentId);
    if (!nextName || log.studentName === nextName) return log;

    changed = true;
    return { ...log, studentName: nextName };
  });

  if (changed) {
    saveBadgeLogs(nextLogs);
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
  getRecentBadgeLogs,
  getBadgeCountByPeriod,
  getWeeklyBadgeCounts,
  getMonthlyBadgeCounts,
  getSemesterBadgeCounts,
  getCustomRangeBadgeCounts,
  clearBadgeLogs,
  syncStudentNames,
  getAllThermostatSettings,
  getThermostatSettings,
  saveThermostatSettings,
};
