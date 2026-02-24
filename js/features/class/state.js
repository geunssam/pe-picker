/**
 * ClassManager 모듈 간 공유 상태
 * 모든 하위 모듈이 이 객체를 import하여 참조로 공유
 */
export const state = {
  editingClassId: null,
  initialized: false,
  // Roster 모달
  rosterCallback: null,
  rosterStudents: [],
  bulkModalRows: [],
  // Team 모달
  teamCallback: null,
  teamStudents: [],
  teamUnassigned: [],
  teamTeams: [],
  teamTeamNames: [],
  teamDraggedId: null,
};
