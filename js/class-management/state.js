/**
 * ClassManager 모듈 간 공유 상태
 * 모든 하위 모듈이 이 객체를 import하여 참조로 공유
 */
export const state = {
  editingClassId: null,
  onSaveCallback: null,
  initialized: false,
  modalStudents: [],
  modalUnassigned: [],
  modalTeams: [],
  modalTeamNames: [],
  draggedStudentId: null,
  bulkModalRows: [],
};
