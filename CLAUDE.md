# CLAUDE.md — PePick! 프로젝트 지침

## 프로젝트 개요

**PePick!** 은 초등 체육 수업용 **술래뽑기 + 모둠뽑기** 웹앱입니다.
Vanilla JS + Firebase Auth/Firestore 기반의 PWA로, Netlify에 배포됩니다.

- **저장소**: https://github.com/geunssam/pe-picker.git
- **배포**: Netlify CLI (`netlify deploy --prod`)
- **Firebase 프로젝트**: `pepick-iwg` (Firestore + Auth만 사용, Hosting 미사용)

## 아키텍처

### 레이어 구조

```
Presentation  →  index.html (셸), login.html, css/ (공용), features/*/*.html+css
Application   →  app.js, template-loader.js, features/ (기능별 JS+HTML+CSS 통합)
Infrastructure →  storage/*-repo.js → Store facade (shared/store.js)
Firebase      →  infra/firebase-config.js, infra/firestore-sync.js, features/auth/auth-manager.js
```

### 모듈 시스템

- **ES Modules** (Vite 번들링)
- 진입점: `js/app.js` (index.html), `js/features/auth/login-main.js` (login.html)
- Firebase modular SDK (ESM, v10.12.2) — CDN import
- `window` 바인딩: `App`, `ClassManager`, `TagGame`, `GroupManager` (onclick 호환)

### 핵심 패턴

| 패턴          | 위치                                      | 설명                                  |
| ------------- | ----------------------------------------- | ------------------------------------- |
| HTML Template | `features/*/*.html`, `template-loader.js` | Vite `?raw` import로 HTML 조각 조립   |
| Repository    | `storage/*-repo.js`                       | localStorage CRUD 캡슐화              |
| Facade        | `shared/store.js`                         | 모든 Repo를 단일 API로 통합           |
| Shared State  | `features/class/state.js`                 | 모듈 간 공유 상태 (참조로 import)     |
| Fisher-Yates  | `shared/ui-utils.js`                      | 정확한 셔플 알고리즘 (유일한 shuffle) |

### 폴더 구조 (Feature Folder)

기능(feature)별로 JS + HTML + CSS가 한 폴더에 모여 있습니다.

```
js/
├── app.js                              # 메인 진입점 (라우팅, 초기화)
├── template-loader.js                  # HTML 템플릿 ?raw import → DOM 삽입
├── types.js                            # JSDoc 타입 정의
│
├── features/
│   ├── auth/                           # 인증 + 동의
│   │   ├── auth-manager.js, consent-manager.js, login-main.js
│   │   ├── login.css, consent-modal.html
│   │
│   ├── wizard/                         # 온보딩 위저드
│   │   ├── wizard.js, wizard.css, wizard.html
│   │
│   ├── class/                          # 학급 관리
│   │   ├── index.js, state.js, helpers.js, modal-editor.js
│   │   ├── csv-import.js, class-firestore.js, class-modal.js
│   │   ├── landing-page.js, settings-page.js
│   │   ├── class-selector.html, settings.html
│   │   └── class-roster-modal.html, class-team-modal.html,
│   │       class-bulk-modal.html, empty-students-modal.html
│   │
│   ├── tag-game/                       # 술래뽑기
│   │   ├── tag-game.js, tag-game-ui.js, tag-game.css
│   │   ├── tag-game.html, tag-number-modal.html,
│   │   │   tag-gender-modal.html, manual-input-modal.html
│   │
│   ├── group-manager/                  # 모둠뽑기
│   │   ├── group-manager.js, group-manager-ui.js, group-manager.css
│   │   ├── group-manager.html, gm-number-modal.html,
│   │   │   gm-gender-modal.html, overflow-modal.html, shortage-modal.html
│   │
│   ├── badge/                          # 배지 시스템
│   │   ├── badge-manager.js, badge-collection-ui.js, badge-config.js
│   │   ├── badge.css, badge-collection.html, badge-award-modal.html
│   │
│   └── tools/                          # 수업 도구 (휘슬, 타이머, 툴바)
│       ├── whistle.js, quick-timer.js, toolbar.js
│       └── whistle-fab.html, timer-fab.html, right-toolbar.html, left-drawer.html
│
├── infra/                              # Firebase 인프라
│   ├── firebase-config.js
│   └── firestore-sync.js
│
├── shared/                             # 공용 유틸 (여러 feature가 공유)
│   ├── store.js, ui-utils.js, sound.js, timer.js
│   ├── icons.js, ios-utils.js, promise-utils.js
│   ├── validators.js, firestore-utils.js, sw-boot.js
│
└── storage/                            # localStorage Repository
    ├── base-repo.js, class-repo.js, tag-game-repo.js
    ├── group-manager-repo.js, badge-repo.js
    ├── settings-repo.js, teacher-repo.js

css/                                    # 공용 CSS만 남김
├── design-system.css, layout.css, animations.css, legal.css

templates/                              # 공용 레이아웃만 남김
├── navbar.html, footer.html
```

## 개발 명령어

```bash
npm run dev          # Vite 개발 서버 (HMR)
npm run build        # 프로덕션 빌드 → dist/
npm run preview      # 빌드 결과 로컬 미리보기
npm run lint         # ESLint 검사
npm run lint:fix     # ESLint 자동 수정
npm run format       # Prettier 포매팅
npm run deploy       # 빌드 + Netlify 배포
```

## 코드 스타일

### 규칙 (ESLint + Prettier 자동 적용)

- **세미콜론**: 필수
- **따옴표**: 싱글 쿼트 (`'`)
- **들여쓰기**: 2칸 스페이스
- **줄 길이**: 최대 100자
- **트레일링 콤마**: ES5 호환 위치만
- **화살표 함수 괄호**: 매개변수 1개면 생략 (`x => x + 1`)
- **줄바꿈**: LF (`\n`)

### import 순서 (권장)

```js
// 1. 외부 라이브러리 (Firebase ESM CDN)
// 2. shared 유틸리티
import { withTimeout } from '../../shared/promise-utils.js';
import { UI } from '../../shared/ui-utils.js';
// 3. storage / store
import { Store } from '../../shared/store.js';
// 4. 같은 폴더 내 모듈
import { renderCards } from './tag-game-ui.js';
// 5. feature CSS (Vite 자동 번들링)
import './tag-game.css';
```

### 네이밍

- **파일명**: kebab-case (`class-modal.js`)
- **함수/변수**: camelCase (`getClasses`, `selectedClassId`)
- **상수**: UPPER_SNAKE_CASE (`KEYS.CLASSES`, `CACHE_VERSION`)
- **localStorage 키**: `pet_` 접두사 (`pet_classes`, `pet_tag_game`)
- **ID 생성**: `generateId(prefix)` from `base-repo.js` (`stu_1234_abc`, `student_1234_xyz`)

## 커밋 컨벤션

```
<type>: <한국어 설명>

<본문 (선택)>
```

**type**: `feat`, `fix`, `refactor`, `style`, `docs`, `chore`, `test`

예시:

```
feat: 모둠뽑기 쿠키 점수 초기화 기능 추가
fix: CSV 가져오기 시 빈 줄 파싱 오류 수정
refactor: ClassManager → class-management/ 모듈 분리
```

## Firebase 정보

- **프로젝트 ID**: `pepick-iwg`
- **Auth**: Google OAuth만 사용
- **Firestore 경로**: `users/{userId}/classes/{classId}/students/{studentId}`
- **보안 규칙**: 사용자별 데이터 격리 (`request.auth.uid == userId`)
- **오프라인 지속성**: 프로덕션에서만 활성화 (로컬 개발 비활성화)
- **Modular SDK** (v10.12.2): ESM CDN import (`https://www.gstatic.com/firebasejs/10.12.2/`)

## 제약사항 및 주의사항

### 절대 하지 말 것

- `Math.random() - 0.5` 정렬 기반 셔플 사용 → `UI.shuffleArray()` (Fisher-Yates) 사용
- 중복 이스케이프 함수 생성 → `UI.escapeHtml()` 하나만 사용
- `withTimeout()` 중복 정의 → `promise-utils.js`에서 import
- `pet_` 접두사 없는 localStorage 키 사용
- `index.html`에 직접 HTML 추가 → 해당 feature 폴더에 `.html` 조각 생성 후 `template-loader.js`에 import 추가
- feature CSS를 `css/`에 넣기 → 해당 feature 폴더에 `.css` 파일 생성 후 feature JS에서 `import './xxx.css'` (Vite 자동 번들링)

### 주의할 것

- HTML의 `onclick` 핸들러는 `window` 바인딩 필요 (ESM 스코프 때문)
- Service Worker(`sw.js`)는 ES Module이 아닌 일반 스크립트
- Firestore 호출은 항상 `withTimeout`으로 감싸기 (오프라인 대비)
- 로컬 모드(비로그인)에서는 Firestore 호출 완전 건너뛰기
- `features/class/state.js`의 상태 객체는 참조로 공유 — 직접 변경 시 모든 모듈에 반영됨
- `mountTemplates()`는 `app.js`의 `init()` 최상단에서 호출 — 다른 모듈의 `getElementById`보다 먼저 실행되어야 함
- `templates/*.html` 및 `features/*/*.html` 파일은 순수 HTML 조각 (`<!DOCTYPE>` 없음, `<html>`/`<body>` 없음)

## 테스트 체크리스트

변경 후 반드시 확인할 항목:

| 기능         | 확인 내용                                        |
| ------------ | ------------------------------------------------ |
| 로그인       | Google 로그인 → Firestore 사용자 문서 생성       |
| 로컬 모드    | Firestore 호출 없이 정상 동작                    |
| 위저드       | 신규 사용자 5단계 온보딩 → 학급 생성             |
| 학급 CRUD    | 추가/편집/삭제 → localStorage + Firestore 동기화 |
| CSV 가져오기 | 파일 업로드 → 학생 파싱                          |
| 술래뽑기     | 학생 선택 → 뽑기 → 결과 카드 → 타이머            |
| 모둠뽑기     | 학생 선택 → 모둠 생성 → 쿠키 점수                |
| 설정         | 기본 모둠이름 편집, 데이터 초기화                |
| PWA          | 오프라인 → 캐시에서 앱 셸 로드                   |
| 기존 데이터  | localStorage 기존 데이터 정상 로드 (하위 호환)   |

## 배포

```bash
# 프로덕션 배포 (Netlify)
npm run build && netlify deploy --prod --dir=dist

# Firestore 규칙만 배포
firebase deploy --only firestore:rules
```
