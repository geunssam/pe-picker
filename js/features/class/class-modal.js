/**
 * 학급 모달 열기/닫기/저장 — Roster + Team 2분할
 */
import { state } from './state.js';
import { Store } from '../../shared/store.js';
import { UI } from '../../shared/ui-utils.js';
import { sanitizeGender, sortStudentsByNumber, getStudentLabel } from './helpers.js';
import {
  initializeRosterState,
  renderRosterEditor,
  initializeTeamState,
  ensureTeamCount,
  sanitizeTeamZones,
  renderTeamEditor,
} from './modal-editor.js';
import { closeBulkRegistrationModal } from './csv-import.js';
import { syncClassToFirestore } from './class-firestore.js';
import { AuthManager } from '../auth/auth-manager.js';

function buildEmptyTeams(teamCount) {
  return Array.from({ length: Math.max(0, teamCount) }, () => []);
}

function trimTrailingEmptySlots(team = []) {
  const nextTeam = [...team];
  while (nextTeam.length > 0 && !nextTeam[nextTeam.length - 1]) {
    nextTeam.pop();
  }
  return nextTeam;
}

function matchTeamMemberToStudent(member, students, usedIds) {
  const memberLabel = typeof member === 'string' ? member.trim() : '';
  if (!memberLabel) return null;

  return (
    students.find(
      student =>
        !usedIds.has(student.id) &&
        ((student.name && student.name === memberLabel) ||
          String(student.number) === memberLabel ||
          getStudentLabel(student) === memberLabel)
    ) || null
  );
}

function rebuildRosterTeams(existing, students) {
  const teamCount = existing?.teamCount || existing?.teams?.length || 6;
  const teamNames = Array.isArray(existing?.teamNames) ? existing.teamNames : [];
  const nextTeams = buildEmptyTeams(teamCount);

  if (!existing || students.length === 0) {
    return { teamCount, teamNames, teams: nextTeams };
  }

  const updatedById = new Map(students.map(student => [student.id, student]));
  const existingStudents = Array.isArray(existing.students)
    ? existing.students.filter(student => student && typeof student === 'object')
    : [];
  const usedIds = new Set();

  for (let teamIdx = 0; teamIdx < teamCount; teamIdx++) {
    const sourceTeam = Array.isArray(existing.teams?.[teamIdx]) ? existing.teams[teamIdx] : [];
    if (sourceTeam.length === 0) continue;

    const rebuiltTeam = sourceTeam.map(member => {
      if (!member) return null;

      const matched = matchTeamMemberToStudent(member, existingStudents, usedIds);
      if (!matched) return null;

      usedIds.add(matched.id);
      const updated = updatedById.get(matched.id);
      return updated ? getStudentLabel(updated) : null;
    });

    nextTeams[teamIdx] = trimTrailingEmptySlots(rebuiltTeam);
  }

  const teamIndexByName = new Map();
  for (let i = 0; i < teamCount; i++) {
    const teamName = (teamNames[i] || `${i + 1}모둠`).trim();
    teamIndexByName.set(teamName, i);
  }

  students.forEach(student => {
    if (usedIds.has(student.id)) return;

    const teamName = (student.team || '').trim();
    const teamIndex = teamIndexByName.get(teamName);
    if (!Number.isInteger(teamIndex)) return;

    nextTeams[teamIndex].push(getStudentLabel(student));
    usedIds.add(student.id);
  });

  return { teamCount, teamNames, teams: nextTeams };
}

// ========== Roster 모달 ==========

export function openRosterModal(classId, callback) {
  state.editingClassId = classId;
  state.rosterCallback = callback || null;

  const titleEl = document.getElementById('roster-modal-title');
  const nameInput = document.getElementById('class-name-input');
  const teacherInput = document.getElementById('roster-teacher-name');

  // 선생님 이름 로드 (저장값 → Google displayName → 빈값)
  const profile = Store.getTeacherProfile();
  const googleName = AuthManager.getCurrentUser()?.displayName || '';
  if (teacherInput) teacherInput.value = profile?.teacherName || googleName;

  if (classId) {
    const cls = Store.getClassById(classId);
    if (cls) {
      if (titleEl) titleEl.textContent = '학급 편집';
      if (nameInput) nameInput.value = cls.name;
      initializeRosterState(cls);
    }
  } else {
    if (titleEl) titleEl.textContent = '새 학급 추가';
    if (nameInput) nameInput.value = '';
    initializeRosterState(null);
  }

  renderRosterEditor();
  UI.showModal('class-roster-modal');
}

export function closeRosterModal() {
  UI.hideModal('class-roster-modal');

  state.editingClassId = null;
  state.rosterEditingStudentId = null;
  closeBulkRegistrationModal();

  const csvFile = document.getElementById('class-csv-file');
  const saveBtn = document.getElementById('roster-modal-save');

  if (csvFile) csvFile.value = '';
  if (saveBtn) saveBtn.disabled = false;

  state.rosterStudents = [];
  state.bulkModalRows = [];

  const listEl = document.getElementById('roster-student-list');
  const previewEl = document.getElementById('roster-pill-preview');
  if (listEl) listEl.innerHTML = '';
  if (previewEl) previewEl.innerHTML = '';
}

export async function saveRoster() {
  const nameInput = document.getElementById('class-name-input');
  const className = nameInput?.value.trim();
  const saveBtn = document.getElementById('roster-modal-save');

  // 선생님 이름 저장
  const teacherInput = document.getElementById('roster-teacher-name');
  const teacherName = teacherInput?.value.trim() || '';
  if (teacherName) {
    const p = Store.getTeacherProfile() || {};
    Store.saveTeacherProfile({ ...p, teacherName });
    const navEl = document.getElementById('navbar-profile-name');
    if (navEl) navEl.textContent = teacherName;
  }

  if (!className) {
    UI.showToast('학급 이름을 입력하세요', 'error');
    return;
  }

  const sorted = state.rosterStudents
    .map(s => {
      const num = parseInt(s.number, 10);
      return {
        ...s,
        name: (s.name || '').trim(),
        number: Number.isFinite(num) && num > 0 ? num : 0,
        gender: sanitizeGender(s.gender),
      };
    })
    .filter(s => s.name.length > 0)
    .sort(sortStudentsByNumber);

  const seenNumbers = new Set();
  for (const student of sorted) {
    if (student.number > 0 && seenNumbers.has(student.number)) {
      UI.showToast(`${student.number}번이 중복되었습니다`, 'error');
      return;
    }
    if (student.number > 0) {
      seenNumbers.add(student.number);
    }
  }

  // number가 0(무효)인 학생은 최대 번호 + 1로 보정
  let maxNum = sorted.reduce((m, s) => Math.max(m, s.number), 0);
  const validStudents = sorted.map(s => ({
    ...s,
    number: s.number > 0 ? s.number : ++maxNum,
    sportsAbility: s.sportsAbility || '',
    tags: Array.isArray(s.tags) ? s.tags : [],
    note: s.note || '',
  }));

  if (validStudents.length === 0) {
    UI.showToast('학생을 한 명 이상 입력하세요', 'error');
    return;
  }

  if (saveBtn) saveBtn.disabled = true;

  try {
    let targetClass = null;

    if (state.editingClassId) {
      // 기존 학급 수정 — team 데이터 보존
      const existing = Store.getClassById(state.editingClassId);
      const { teamNames, teams, teamCount } = rebuildRosterTeams(existing, validStudents);
      targetClass = Store.updateClass(
        state.editingClassId,
        className,
        validStudents,
        teamNames,
        teams,
        teamCount
      );
      if (targetClass) {
        Store.syncBadgeStudentNames(targetClass.id, targetClass.students);
      }

      // 전출 대기 학생 처리
      if (state.pendingTransfers.length > 0) {
        console.debug(
          '[Transfer] saveRoster: pendingTransfers =',
          state.pendingTransfers.map(s => s.name)
        );
        for (const student of state.pendingTransfers) {
          Store.addTransferredStudent(state.editingClassId, {
            ...student,
            transferredAt: new Date().toISOString(),
          });
          console.debug('[Transfer] added:', student.name, '→ transferredStudents');
        }
        state.pendingTransfers = [];
      }

      UI.showToast(`${className} 수정 완료`, 'success');
    } else {
      // 새 학급 추가 — team 기본값
      targetClass = Store.addClass(className, validStudents, [], [], 6);
      UI.showToast(`${className} 추가 완료`, 'success');
    }

    if (targetClass) {
      // 전출 처리 후 최신 데이터로 Firestore 동기화
      const freshClass = Store.getClassById(targetClass.id) || targetClass;
      syncClassToFirestore(freshClass).catch(err => {
        console.warn('[ClassModal] Firestore sync skipped:', err);
      });
    }

    const cb = state.rosterCallback;
    closeRosterModal();
    if (cb) cb();
  } catch (error) {
    console.error('학급 저장 실패:', error);
    UI.showToast('저장 중 오류가 발생했습니다. 다시 시도해주세요.', 'error');
    if (saveBtn) saveBtn.disabled = false;
  }
}

// ========== Team 모달 ==========

export function openTeamModal(classId, callback) {
  state.editingClassId = classId;
  state.teamCallback = callback || null;

  const cls = Store.getClassById(classId);
  if (!cls) {
    UI.showToast('학급을 찾을 수 없습니다', 'error');
    return;
  }

  const titleEl = document.getElementById('team-modal-title');
  if (titleEl) titleEl.textContent = `${cls.name} - 모둠 편집`;

  const countInput = document.getElementById('team-modal-count');
  const teamCount = cls.teamCount || cls.teams?.length || 6;
  if (countInput) countInput.value = teamCount;

  // 저장 버튼 활성화 복원
  const saveBtn = document.getElementById('team-modal-save');
  if (saveBtn) saveBtn.disabled = false;

  initializeTeamState(cls);

  // 행 수 초기값: 학생수/모둠수 기반 + 기존 배치 중 최대값 반영
  const rowsInput = document.getElementById('team-modal-rows');
  if (rowsInput) {
    const totalStudents = state.teamStudents.length;
    let autoRows = Math.max(1, Math.ceil(totalStudents / teamCount));
    state.teamTeams.forEach(team => {
      if (team.length > autoRows) autoRows = team.length;
    });
    rowsInput.value = autoRows;
  }
  renderTeamEditor();
  UI.showModal('class-team-modal');
}

export function closeTeamModal() {
  UI.hideModal('class-team-modal');

  state.editingClassId = null;
  state.teamDraggedId = null;
  state.teamActiveGroup = null;

  state.teamStudents = [];
  state.teamUnassigned = [];
  state.teamTeams = [];
  state.teamTeamNames = [];

  const poolEl = document.getElementById('team-unassigned-pool');
  const boardEl = document.getElementById('team-assign-board');
  if (poolEl) poolEl.innerHTML = '';
  if (boardEl) boardEl.innerHTML = '';
}

export async function saveTeams() {
  const saveBtn = document.getElementById('team-modal-save');
  const countInput = document.getElementById('team-modal-count');
  const teamCount = ensureTeamCount(parseInt(countInput?.value, 10) || 6);
  if (countInput) countInput.value = teamCount;

  sanitizeTeamZones();

  // 학생 라벨 맵 (ID → name 또는 번호 문자열)
  const labelById = new Map(state.teamStudents.map(s => [s.id, getStudentLabel(s)]));

  const finalTeams = state.teamTeams.slice(0, teamCount).map(group =>
    group.map(id => {
      if (!id) return null;
      const label = labelById.get(id);
      return label != null && label !== '' ? label : null;
    })
  );

  const finalTeamNames = Array.from({ length: teamCount }, (_, idx) => {
    const raw = (state.teamTeamNames[idx] || '').trim();
    return raw || `${idx + 1}모둠`;
  });

  if (saveBtn) saveBtn.disabled = true;

  try {
    // 기존 name/students 보존
    const existing = Store.getClassById(state.editingClassId);
    if (!existing) {
      UI.showToast('학급을 찾을 수 없습니다', 'error');
      if (saveBtn) saveBtn.disabled = false;
      return;
    }

    // 학생별 team 필드 업데이트 (모둠 배정 반영)
    // ID → 모둠 이름 맵 (finalTeams의 라벨 대신 state에서 ID 기반 매핑)
    const idToTeamName = new Map();
    state.teamTeams.slice(0, teamCount).forEach((group, teamIdx) => {
      const teamName = finalTeamNames[teamIdx] || `${teamIdx + 1}모둠`;
      group.forEach(id => {
        if (id) idToTeamName.set(id, teamName);
      });
    });

    const updatedStudents = existing.students.map(s => {
      if (typeof s === 'string') return s;
      // teamStudents에서 같은 학생 찾기 (id 매칭)
      const modalStudent = state.teamStudents.find(ts => ts.id === s.id);
      const teamName = modalStudent ? idToTeamName.get(modalStudent.id) || '' : s.team || '';
      return { ...s, team: teamName };
    });

    const targetClass = Store.updateClass(
      state.editingClassId,
      existing.name,
      updatedStudents,
      finalTeamNames,
      finalTeams,
      teamCount
    );

    UI.showToast('모둠 편집 완료', 'success');

    if (targetClass) {
      syncClassToFirestore(targetClass).catch(err => {
        console.warn('[ClassModal] Firestore sync skipped:', err);
      });
    }

    const cb = state.teamCallback;
    closeTeamModal();
    if (cb) cb();
  } catch (error) {
    console.error('모둠 저장 실패:', error);
    UI.showToast('저장 중 오류가 발생했습니다. 다시 시도해주세요.', 'error');
    if (saveBtn) saveBtn.disabled = false;
  }
}

export async function resetStudentsForClass(classId) {
  const cls = Store.getClassById(classId);
  if (!cls) {
    UI.showToast('학급을 찾을 수 없습니다', 'error');
    return false;
  }

  if (!Array.isArray(cls.students) || cls.students.length === 0) {
    UI.showToast('초기화할 학생이 없습니다', 'info');
    return false;
  }

  const choice = await UI.showSelect('학생 초기화 범위를 선택하세요', [
    {
      key: 'roster',
      label: '명단만 초기화',
      description: '배지 기록은 유지됩니다',
    },
    {
      key: 'all',
      label: '전체 초기화',
      description: '학생, 배지, 모둠, 술래뽑기 기록 모두 삭제',
      danger: true,
    },
  ]);

  if (!choice) return false;

  const teamCount = cls.teamCount || cls.teams?.length || 6;
  const targetClass = Store.updateClass(
    classId,
    cls.name,
    [],
    cls.teamNames || [],
    buildEmptyTeams(teamCount),
    teamCount
  );

  Store.clearCurrentTeams();
  Store.clearTagGameData();

  if (choice === 'all') {
    Store.clearBadgeLogs(classId);
  }

  if (targetClass) {
    syncClassToFirestore(targetClass).catch(error => {
      console.warn('[ClassModal] Firestore sync skipped:', error);
    });
  }

  window.dispatchEvent(new CustomEvent('badge-updated'));

  const msg = choice === 'all' ? '전체 초기화 완료' : '학생 명단 초기화 완료 (배지 기록 유지)';
  UI.showToast(msg, 'success');
  return true;
}
