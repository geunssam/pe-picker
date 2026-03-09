roq# CSV 재업로드 시 학생 배지 기록 보존 — 구현 작업서

> **작성일**: 2026-03-09
> **목표**: CSV 재업로드 시 기존 학생 ID를 매칭하여 배지/XP 기록 보존
> **상태**: Phase 1~3 완료, Phase 4 (수동 테스트) 대기

---

## Phase 개요

| Phase  | 내용                          | 파일 수 | 상태 |
| ------ | ----------------------------- | ------- | ---- |
| **P1** | 매칭 알고리즘 + 배지 삭제 API | 3       | DONE |
| **P2** | 확인 모달 UI (HTML + CSS)     | 2       | DONE |
| **P3** | 통합 연결 + 이벤트 바인딩     | 3       | DONE |
| **P4** | 테스트 + 회귀 검증            | 0       | TODO |

---

## Phase 1: 매칭 알고리즘 + 배지 삭제 API — DONE

### TODO

- [x] **P1-1** `reconcileCSV(csvRows, existingStudents)` 함수 작성
- [x] **P1-2** `handleCSVImport()` 분기 로직 추가
- [x] **P1-3** `removeBadgeLogsForStudents()` 함수 추가
- [x] **P1-4** Store facade에 래퍼 추가

### 품질 검증: PASS

- Lint: PASS
- Build: PASS
- 알고리즘 리뷰: 동명이인/번호변경/전출 처리 정상

---

## Phase 2: 확인 모달 UI — DONE

### TODO

- [x] **P2-1** `csv-reconcile-modal.html` 생성
- [x] **P2-2** `csv-reconcile.css` 생성

### 품질 검증: PASS

- Lint: PASS
- Build: PASS

---

## Phase 3: 통합 연결 + 이벤트 바인딩 — DONE

### TODO

- [x] **P3-1** 모달 렌더링/이벤트 함수 작성 (Phase 1에서 함께 구현)
- [x] **P3-2** `template-loader.js`에 모달 import 추가
- [x] **P3-3** `index.js`에 이벤트 바인딩 추가

### 품질 검증: PASS

- Lint: PASS
- Build: PASS (292.73 kB JS, 117.91 kB CSS)
- DOM ID 매칭: PASS (7개 선택자 + 3개 버튼 ID 일치)
- Export/Import 정합성: PASS (13개 함수 확인)

---

## Phase 4: 테스트 + 회귀 검증 — TODO

### 수동 테스트 체크리스트

`npm run dev` 실행 후 브라우저에서 확인:

| #   | 시나리오                | 확인 내용                             | 통과 |
| --- | ----------------------- | ------------------------------------- | ---- |
| 1   | 빈 학급에 CSV 업로드    | 확인 모달 없이 바로 적용 (기존 동작)  |      |
| 2   | 동일 학생 CSV 재업로드  | 전원 매칭, ID 변화 없음, 배지 유지    |      |
| 3   | 전학생 추가 CSV         | 기존 학생 매칭 + 신규 추가, 배지 유지 |      |
| 4   | 전출 학생 있는 CSV      | 전출 표시, "배지 유지" 기본 선택      |      |
| 5   | 전출 학생 배지 삭제     | 배지 로그 삭제 확인                   |      |
| 6   | 동명이인 (성별 다름)    | 이름+성별로 정확히 매칭               |      |
| 7   | 동명이인 (성별 같음)    | 자동 매칭 + 경고 표시                 |      |
| 8   | 번호만 변경 (이름 동일) | 이름 매칭, 번호 업데이트, 배지 유지   |      |
| 9   | 취소 버튼               | 아무 변경 없음                        |      |
| 10  | 일괄등록 모달           | 기존 동작 유지 (회귀 없음)            |      |
| 11  | Firestore 동기화        | 중복 학생 생성 없음                   |      |
| 12  | 드래그 순서 변경        | 기존 동작 유지 (회귀 없음)            |      |
| 13  | 학생 이름/번호 수정     | 기존 동작 유지 (회귀 없음)            |      |

---

## 수정된 파일 요약

| 파일                                         | 변경 내용                                                                                                                         |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `js/features/class/csv-import.js`            | reconcileCSV, showReconcileModal, applyReconciliation, closeReconcileModal, handleReconcileModalClick 추가 + handleCSVImport 분기 |
| `js/features/class/csv-reconcile-modal.html` | **신규** — 매칭 결과 확인 모달                                                                                                    |
| `js/features/class/csv-reconcile.css`        | **신규** — 모달 스타일                                                                                                            |
| `js/template-loader.js`                      | csvReconcileHtml import + modalsHtml 결합                                                                                         |
| `js/features/class/index.js`                 | reconcile 함수 import + 이벤트 바인딩                                                                                             |
| `js/storage/badge-repo.js`                   | removeBadgeLogsForStudents 함수 추가                                                                                              |
| `js/shared/store.js`                         | removeBadgeLogsForStudents 래퍼 추가                                                                                              |

## 수정하지 않은 파일 (중요)

| 파일                | 이유                                          |
| ------------------- | --------------------------------------------- |
| `modal-editor.js`   | `applyImportedStudents()` 변경 없음           |
| `helpers.js`        | `createModalStudent()` 이미 ID 보존 로직 있음 |
| `class-modal.js`    | `saveRoster()` 변경 없음                      |
| `firestore-sync.js` | ID 보존으로 기존 동기화 자연 작동             |
