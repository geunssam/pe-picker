/**
 * 클라이언트 측 데이터 검증 유틸리티
 * Firestore 보안규칙과 동일한 제한을 클라이언트에서 사전 검증
 */

export const LIMITS = {
  STUDENT_NAME_MAX: 30,
  STUDENT_NUMBER_MAX: 99,
  CLASS_NAME_MAX: 50,
  CLASS_NAME_MIN: 1,
  TEACHER_NAME_MAX: 30,
  TEAM_COUNT_MAX: 20,
  CSV_MAX_LINES: 200,
  CSV_MAX_FILE_SIZE: 512 * 1024, // 512KB
  GENDER_MAX: 10,
};

/**
 * 학생 이름 검증
 * @param {string} name
 * @returns {boolean}
 */
export function isValidStudentName(name) {
  return typeof name === 'string' && name.length > 0 && name.length <= LIMITS.STUDENT_NAME_MAX;
}

/**
 * 학생 번호 검증
 * @param {number} num
 * @returns {boolean}
 */
export function isValidStudentNumber(num) {
  return Number.isInteger(num) && num >= 0 && num <= LIMITS.STUDENT_NUMBER_MAX;
}

/**
 * 학급 이름 검증
 * @param {string} name
 * @returns {boolean}
 */
export function isValidClassName(name) {
  return (
    typeof name === 'string' &&
    name.length >= LIMITS.CLASS_NAME_MIN &&
    name.length <= LIMITS.CLASS_NAME_MAX
  );
}

/**
 * 교사 이름 검증
 * @param {string} name
 * @returns {boolean}
 */
export function isValidTeacherName(name) {
  return typeof name === 'string' && name.length > 0 && name.length <= LIMITS.TEACHER_NAME_MAX;
}

/**
 * 성별 검증
 * @param {string} gender
 * @returns {boolean}
 */
export function isValidGender(gender) {
  return typeof gender === 'string' && gender.length <= LIMITS.GENDER_MAX;
}
