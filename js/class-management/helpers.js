/**
 * ClassManager 순수 헬퍼 함수들
 * DOM/상태 의존성 없음
 */
import { generateId } from '../storage/base-repo.js';

export function sanitizeGender(value) {
  if (value === 'male' || value === '남' || value === '남자') return 'male';
  if (value === 'female' || value === '여' || value === '여자') return 'female';
  return '';
}

export function normalizeStudentName(student) {
  if (typeof student === 'string') return student.trim();
  if (student && typeof student.name === 'string') return student.name.trim();
  return '';
}

export function sortStudentsByNumber(a, b) {
  const numA = parseInt(a.number, 10);
  const numB = parseInt(b.number, 10);
  const safeA = Number.isFinite(numA) && numA > 0 ? numA : Number.MAX_SAFE_INTEGER;
  const safeB = Number.isFinite(numB) && numB > 0 ? numB : Number.MAX_SAFE_INTEGER;
  if (safeA !== safeB) return safeA - safeB;
  return (a.name || '').localeCompare(b.name || '', 'ko');
}

export function createModalStudent(rawStudent = {}, fallbackNumber = 0) {
  const hasObject = rawStudent && typeof rawStudent === 'object';
  const name = normalizeStudentName(rawStudent);
  const numberCandidate = hasObject ? parseInt(rawStudent.number, 10) : NaN;

  return {
    id: hasObject && rawStudent.id ? `${rawStudent.id}` : `student-${generateId()}`,
    name,
    number:
      Number.isFinite(numberCandidate) && numberCandidate > 0 ? numberCandidate : fallbackNumber,
    gender: hasObject ? sanitizeGender(rawStudent.gender) : '',
    team: hasObject && typeof rawStudent.team === 'string' ? rawStudent.team : '',
    sportsAbility:
      hasObject && typeof rawStudent.sportsAbility === 'string' ? rawStudent.sportsAbility : '',
    tags: hasObject && Array.isArray(rawStudent.tags) ? rawStudent.tags : [],
    note: hasObject && typeof rawStudent.note === 'string' ? rawStudent.note : '',
  };
}
