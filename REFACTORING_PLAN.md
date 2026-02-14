# PePick! 리팩토링 계획 + 에이전트 팀 구성

## 에이전트 팀 구성

5개 라운드를 4명의 전문 에이전트가 담당합니다.
각 에이전트는 자신의 담당 폴더와 파일에만 작업하며, 의존 관계를 지켜 순서대로 실행됩니다.

### 🏗 Infra (인프라 에이전트)

**담당**: Round 1 + Round 2 설정 + Round 5 마무리
**작업 파일**:

```
vite.config.js          (생성)
package.json            (수정)
firebase.json           (수정)
index.html              (script 태그 정리)
login.html              (script 태그 정리)
sw.js                   (캐시 전략 변경)
.eslintrc.json          (ESM 설정 업데이트)
.gitignore              (수정)
CLAUDE.md               (최종 업데이트)
```

**역할**:

- Vite 설치 및 설정 (`vite.config.js`, `package.json` 스크립트)
- HTML 파일에서 21개 `<script>` 태그 → 1개 `<script type="module">` 전환
- `login.html`용 `js/login-main.js` 진입점 생성
- Service Worker를 network-first 전략으로 변경
- ESLint를 ESM 호환으로 업데이트 (`sourceType: "module"`, globals 제거)
- 빌드/배포 테스트 (`npm run build`, `netlify deploy`)
- CLAUDE.md 최종 반영

---

### 🔄 Converter (ESM 변환 에이전트)

**담당**: Round 2 핵심 — 모든 IIFE → ES Modules 변환
**작업 파일**: `js/` 하위 전체 23개 파일

**변환 순서** (의존성 바닥 → 꼭대기):

| 순서 | 파일                                   | export 대상                                  |
| ---- | -------------------------------------- | -------------------------------------------- |
| 1    | `js/types.js`                          | (변경 없음 — JSDoc)                          |
| 2    | `js/storage/base-repo.js`              | `KEYS`, `get`, `set`, `remove`, `generateId` |
| 3    | `js/storage/settings-repo.js`          | `SettingsRepo`                               |
| 4    | `js/storage/class-repo.js`             | `ClassRepo`                                  |
| 5    | `js/storage/tag-game-repo.js`          | `TagGameRepo`                                |
| 6    | `js/storage/group-manager-repo.js`     | `GroupManagerRepo`                           |
| 7    | `js/storage/teacher-repo.js`           | `TeacherRepo`                                |
| 8    | `js/shared/store.js`                   | `Store` (default)                            |
| 9    | `js/core/tag-picker.js`                | `TagPicker`                                  |
| 10   | `js/core/group-picker.js`              | `GroupPicker`                                |
| 11   | `js/shared/sound.js`                   | `Sound`                                      |
| 12   | `js/shared/ui-utils.js`                | `UI`                                         |
| 13   | `js/shared/timer.js`                   | `TimerModule`                                |
| 14   | `js/shared/ios-utils.js`               | `IosUtils`                                   |
| 15   | `js/firebase-config.js`                | `FirebaseConfig`                             |
| 16   | `js/auth-manager.js`                   | `AuthManager`                                |
| 17   | `js/firestore-sync.js`                 | `FirestoreSync`                              |
| 18   | `js/shared/class-manager.js`           | `ClassManager`                               |
| 19   | `js/tag-game/tag-game-ui.js`           | `TagGameUI`                                  |
| 20   | `js/tag-game/tag-game.js`              | `TagGame`                                    |
| 21   | `js/group-manager/group-manager-ui.js` | `GroupManagerUI`                             |
| 22   | `js/group-manager/group-manager.js`    | `GroupManager`                               |
| 23   | `js/wizard.js`                         | `WizardManager`                              |
| 24   | `js/app.js`                            | (진입점 — window 바인딩)                     |
| 25   | `js/shared/sw-boot.js`                 | (독립 실행)                                  |

**변환 패턴**:

```js
// BEFORE (IIFE)
const ModuleName = (() => {
  function publicMethod() { ... }
  return { publicMethod };
})();

// AFTER (ESM)
import { dependency } from './dependency.js';
function publicMethod() { ... }
export const ModuleName = { publicMethod };
// 또는: export default { publicMethod };
```

**window 바인딩** (`app.js`에서):

```js
window.App = App;
window.ClassManager = ClassManager;
window.TagGame = TagGame;
window.GroupManager = GroupManager;
```

---

### 🧹 Dedup (중복 제거 에이전트)

**담당**: Round 3 — 중복 코드 제거 + 유틸리티 추출
**작업 파일**:

| 작업                 | 생성/수정 파일                            | 중복 제거 위치                        |
| -------------------- | ----------------------------------------- | ------------------------------------- |
| `withTimeout` 추출   | `js/shared/promise-utils.js` (생성)       | `app.js:265`, `auth-manager.js:195`   |
| `decodeGroups` 추출  | `js/shared/firestore-utils.js` (생성)     | `app.js:318`, `firestore-sync.js:180` |
| `escapeAttr` 제거    | `class-manager.js` (수정)                 | `ui-utils.js`의 `escapeHtml`로 통일   |
| ID 생성 통합         | `wizard.js` 등 (수정)                     | `BaseRepo.generateId(prefix)` 하나로  |
| `shuffle` 통합       | `tag-picker.js`, `group-picker.js` (수정) | `UI.shuffleArray()` 하나로            |
| localStorage 키 통일 | `auth-manager.js` 등 (수정)               | `pet_` 접두사 통일 + 하위 호환        |

**새로 생성하는 파일**:

```
js/shared/promise-utils.js     (~20줄)  withTimeout(promise, ms)
js/shared/firestore-utils.js   (~30줄)  decodeGroupsFromFirestore(data)
```

---

### 🏛 Architect (구조 설계 에이전트)

**담당**: Round 4 — ClassManager 분리 + Event Bus + 파일 이동
**작업 파일**:

#### 4-1. ClassManager 분리 (1,488줄 → 8개 파일)

```
js/class-management/               (새 폴더)
├── index.js           (~50줄)    Facade: init(), populateSelect()
├── helpers.js         (~60줄)    sanitizeGender, normalizeStudentName, sortStudents
├── class-modal.js     (~400줄)   openModal, closeModal, saveClass
├── student-editor.js  (~350줄)   modalStudents 상태, 카드 렌더링, 번호 정규화
├── drag-drop.js       (~80줄)    드래그앤드롭 전체
├── csv-import.js      (~120줄)   CSV 파싱, 구글시트 가져오기
├── class-firestore.js (~100줄)   syncClassToFirestore, deleteClassFromFirestore
├── landing-page.js    (~80줄)    학급 선택 랜딩 페이지 렌더링
└── settings-page.js   (~120줄)   설정 페이지 UI, 기본 모둠이름 관리
```

**분리 원칙**:

- `index.js`는 Facade — 다른 파일에서 `import ClassManager from './class-management/index.js'`
- 각 파일은 자신의 관심사만 담당
- 공유 상태(`modalStudents`, `currentEditingClassId`)는 `index.js`에서 관리하고 필요한 파일에 전달

#### 4-2. Event Bus 생성

```
js/shared/event-bus.js  (~30줄)
```

```js
// 사용 예시
EventBus.emit('navigate', { route: 'tag-game' });
EventBus.emit('data-changed', { source: 'firestore' });
EventBus.on('navigate', handler);
```

**순환 의존성 해소**:

- ClassManager → `EventBus.emit('navigate', ...)` (App 직접 호출 대신)
- FirestoreSync → `EventBus.emit('data-changed')` (각 모듈 직접 호출 대신)
- App → `EventBus.on('navigate', ...)` 등록

#### 4-3. core/ 알고리즘 실제 연결

- `tag-game.js` 인라인 뽑기 로직 → `TagPicker.pickItAndAngel()` 호출
- `group-manager.js` 인라인 배정 로직 → `GroupPicker.assign()` 호출

#### 4-4. 좀비 코드 정리

- 중복 `deleteLandingClass()` → `deleteClass()`로 통합
- `wizard.html` 삭제 (index.html SPA에 통합됨)
- 레거시 `#class-students-input` 숨김 필드 제거

#### 4-5. 파일 이동

```
js/firebase-config.js   → js/firebase/firebase-config.js
js/auth-manager.js      → js/firebase/auth-manager.js
js/firestore-sync.js    → js/firebase/firestore-sync.js
js/wizard.js            → js/wizard/wizard.js
```

---

## 실행 순서 (브랜치 전략)

```
main (v1.0-pre-refactor 태그)
 │
 ├── refactor/round1  ✅ (완료: CLAUDE.md, hooks, firestore.rules)
 │    │
 │    ├── refactor/round2  ← [Infra] Vite 설정 + [Converter] ESM 전환
 │    │    │
 │    │    ├── refactor/round3  ← [Dedup] 중복 제거
 │    │    │    │
 │    │    │    ├── refactor/round4  ← [Architect] 구조 리팩토링
 │    │    │    │    │
 │    │    │    │    ├── refactor/round5  ← [Infra] 마무리 + 빌드 + 배포
 │    │    │    │    │    │
 │    │    │    │    │    └── → main 머지
```

**각 라운드 완료 조건**:

1. `npm run dev`로 개발 서버 기동
2. 테스트 체크리스트 (CLAUDE.md 참조) 수동 검증
3. 커밋 메시지에 라운드 번호 포함

---

## 검증 체크리스트

| 기능         | 테스트 항목                                     |
| ------------ | ----------------------------------------------- |
| 로그인       | Google 로그인 → Firestore 사용자 문서 생성 확인 |
| 로그인       | 로컬 모드 → Firestore 호출 없이 정상 진행       |
| 위저드       | 신규 사용자 5단계 온보딩 → 학급 생성            |
| 학급 선택    | 랜딩 페이지 학급 카드 렌더링                    |
| 학급 추가    | 모달 → 학생 추가 → 저장 → Firestore 동기화      |
| 학급 편집    | 학생 드래그앤드롭 모둠 배치                     |
| CSV 가져오기 | CSV 파일 업로드 → 학생 파싱                     |
| 학급 삭제    | 삭제 → localStorage + Firestore 모두 제거       |
| 술래뽑기     | 학생 선택 → 뽑기 → 결과 카드 → 타이머           |
| 모둠뽑기     | 학생 선택 → 모둠 생성 → 쿠키 점수               |
| 고정 모둠    | 저장된 모둠 재사용                              |
| 설정         | 기본 모둠이름 편집, 데이터 초기화               |
| 로그아웃     | login.html 이동, 동기화 리스너 정지             |
| PWA          | 오프라인 → 캐시에서 앱 셸 로드                  |
| 기존 데이터  | localStorage 기존 데이터 정상 로드 (호환성)     |

---

## 주요 파일 변경 요약

| 파일                           | 담당 에이전트 | 변경 내용                 |
| ------------------------------ | ------------- | ------------------------- |
| `vite.config.js`               | Infra         | 신규 생성                 |
| `package.json`                 | Infra         | Vite + 스크립트 추가      |
| `index.html`                   | Infra         | 21개 script → 1개 module  |
| `login.html`                   | Infra         | module script 변경        |
| `sw.js`                        | Infra         | network-first 전략        |
| `js/*.js` (23개)               | Converter     | IIFE → ESM 전환           |
| `js/login-main.js`             | Converter     | 신규 생성 (로그인 진입점) |
| `js/shared/promise-utils.js`   | Dedup         | 신규 (withTimeout)        |
| `js/shared/firestore-utils.js` | Dedup         | 신규 (decodeGroups)       |
| `js/shared/event-bus.js`       | Architect     | 신규 (on/off/emit)        |
| `js/class-management/*`        | Architect     | 신규 폴더 (8개 파일)      |
| `js/firebase/*`                | Architect     | 기존 파일 이동            |
| `js/wizard/wizard.js`          | Architect     | 기존 파일 이동            |
| `js/shared/class-manager.js`   | Architect     | 삭제 (분리 완료 후)       |
| `wizard.html`                  | Architect     | 삭제 (SPA 통합됨)         |
| `CLAUDE.md`                    | Infra         | 최종 구조 반영            |

---

**최종 목표 폴더 구조**:

```
js/
├── app.js                     진입점
├── login-main.js              로그인 진입점
├── types.js                   JSDoc 타입
├── core/                      순수 알고리즘
│   ├── tag-picker.js
│   └── group-picker.js
├── storage/                   localStorage Repository
│   ├── base-repo.js
│   ├── class-repo.js
│   ├── tag-game-repo.js
│   ├── group-manager-repo.js
│   ├── settings-repo.js
│   └── teacher-repo.js
├── shared/                    공용 유틸리티
│   ├── store.js
│   ├── ui-utils.js
│   ├── sound.js
│   ├── timer.js
│   ├── ios-utils.js
│   ├── event-bus.js           ← NEW
│   ├── promise-utils.js       ← NEW
│   ├── firestore-utils.js     ← NEW
│   └── sw-boot.js
├── firebase/                  Firebase 관련 ← MOVED
│   ├── firebase-config.js
│   ├── auth-manager.js
│   └── firestore-sync.js
├── class-management/          학급관리 ← NEW (분리)
│   ├── index.js
│   ├── helpers.js
│   ├── class-modal.js
│   ├── student-editor.js
│   ├── drag-drop.js
│   ├── csv-import.js
│   ├── class-firestore.js
│   ├── landing-page.js
│   └── settings-page.js
├── tag-game/                  술래뽑기
│   ├── tag-game.js
│   └── tag-game-ui.js
├── group-manager/             모둠뽑기
│   ├── group-manager.js
│   └── group-manager-ui.js
└── wizard/                    온보딩 ← MOVED
    └── wizard.js
```
