# PEPick 도메인 분석 & Feature Folder 전환 계획

> 작성일: 2026-02-24
> 브랜치: feature/commercialize

---

## 1. 프로젝트 개요

**PEPick!** 은 초등 체육 수업용 **술래뽑기 + 모둠뽑기 + 배지 관리** 웹앱.
Vanilla JS + Firebase Auth/Firestore 기반 SPA, Vite 빌드, Netlify 배포.

### 코드베이스 규모

| 구분           | 파일 수  | 줄 수         |
| -------------- | -------- | ------------- |
| JavaScript     | 44개     | ~10,500줄     |
| HTML Templates | 25개     | ~3,600줄      |
| CSS            | 9개      | ~6,800줄      |
| **합계**       | **78개** | **~21,000줄** |

---

## 2. 도메인 전체 지도

PEPick은 **7개 비즈니스 도메인 + 3개 인프라 도메인**으로 구성.

| #   | 도메인                       | 줄 수  | 핵심 책임                        | 복잡도 |
| --- | ---------------------------- | ------ | -------------------------------- | ------ |
| 1   | **인증 (Auth)**              | ~400   | Google OAuth, 세션 관리          | 낮음   |
| 2   | **온보딩 (Wizard)**          | ~1,180 | 신규 교사 5단계 위저드           | 중간   |
| 3   | **동의 관리 (Consent)**      | ~300   | 약관/개인정보 동의 게이트        | 낮음   |
| 4   | **학급 관리 (Class)**        | ~2,200 | 학급/학생 CRUD, 모둠 편집, CSV   | 높음   |
| 5   | **술래뽑기 (Tag Game)**      | ~2,500 | 술래/천사 랜덤 뽑기 + 타이머     | 높음   |
| 6   | **모둠뽑기 (Group Manager)** | ~2,500 | 랜덤/고정 모둠 배정 + 타이머     | 높음   |
| 7   | **배지 시스템 (Badge)**      | ~2,950 | 배지 부여, XP/레벨, 온도계, 도감 | 높음   |
| 8   | 데이터 저장 (Storage)        | ~1,030 | localStorage Repository 패턴     | -      |
| 9   | Firestore 동기화 (Sync)      | ~770   | 양방향 실시간 동기화             | -      |
| 10  | 공용 유틸리티 (Shared)       | ~1,850 | 사운드, 휘슬, 타이머, UI 유틸    | -      |

---

## 3. 각 도메인 상세 분석

### 3.1 인증 도메인 (Auth)

**코드 위치**: `firebase-config.js`(63줄), `auth-manager.js`(142줄), `login-main.js`(127줄)

**엔티티**: Firebase User 객체 (외부 의존). 내부적으로 `currentUser` 상태만 관리.

**비즈니스 규칙**:

- Google OAuth만 지원 (`GoogleAuthProvider`, `prompt: 'select_account'`)
- `browserLocalPersistence`로 세션 유지
- 모든 비동기 호출에 `withTimeout` 적용 (signIn 30초, signOut 8초)
- 로그인 페이지와 메인 앱이 별도 HTML (`login.html`, `index.html`)

**워크플로**:

```
login.html → AuthManager.init() → waitForAuthReady()
  → 이미 로그인됨 → index.html 리다이렉트
  → 미로그인 → "Google로 시작하기" → signInWithGoogle() → index.html
```

---

### 3.2 온보딩 도메인 (Wizard)

**코드 위치**: `wizard.js`(348줄), `wizard.html`(162줄), `wizard.css`(671줄)

**엔티티**:

```javascript
wizardData = {
  schoolLevel: null, // 'elementary' | 'middle' | 'high'
  selectedGrades: [], // [3, 4, 5]
  classCount: {}, // { 3: 3, 4: 2 }
  studentCounts: {}, // { "3-1": 20, "3-2": 20 }
  teacherName: '',
};
```

**비즈니스 규칙**:

- 5단계: 학교급 → 담당 학년(복수) → 학년별 반 수(1~15) → 학급별 학생 수(1~45, 기본 20) → 교사 이름(선택)
- 완료 시 학급 일괄 생성 → localStorage + Firestore 동기화

---

### 3.3 동의 관리 도메인 (Consent)

**코드 위치**: `consent-manager.js`(192줄), `consent-modal.html`(107줄)

**비즈니스 규칙**:

- 앱 부트스트랩 시 `ensureConsent()` 게이트 호출
- 로컬 캐시 → Firestore 순서로 동의 여부 확인
- 이용약관 + 개인정보처리방침 2개 모두 체크 필수
- 동의 거부 시 로그아웃 처리

---

### 3.4 학급 관리 도메인 (Class Management)

**코드 위치**: `class-management/` 8개 파일 (~2,000줄)

- `index.js`(222줄) — Facade
- `state.js`(19줄) — 공유 상태
- `helpers.js`(45줄) — 순수 헬퍼
- `modal-editor.js`(615줄) — 학생 카드 CRUD + 드래그앤드롭
- `csv-import.js`(248줄) — CSV/구글시트 + 일괄등록
- `class-modal.js`(268줄) — 학급 추가/편집/모둠 편집
- `class-firestore.js`(199줄) — Firestore 동기화
- `landing-page.js`(85줄) + `settings-page.js`(166줄)

**엔티티**:

```javascript
Class = { id, name, students[], teamNames[], teams[][], teamCount, createdAt, year, grade }
Student = { id, name, number, gender, team, sportsAbility, tags[], note }
```

**비즈니스 규칙**:

- 학급명 1~50자, 학생명 최대 30자, 출석번호 0~99
- 모둠 수 최대 20개, CSV 최대 200줄/512KB
- 성별: 'male/female/남/여/남자/여자' 모두 인식
- 학급 삭제 시 Firestore 학생 서브컬렉션도 함께 삭제

**Firestore 구조**:

```
users/{uid}/classes/{classId}/students/{studentId}
```

---

### 3.5 술래뽑기 도메인 (Tag Game)

**코드 위치**: `tag-game/tag-game.js`(893줄), `tag-game-ui.js`(93줄), `tag-game.html`(534줄), `tag-game.css`(605줄)

**엔티티**:

```javascript
TagGameState = {
  currentPhase: 1|2|3,     // 설정/결과/타이머
  participants: string[],   // 참가자
  selectedIts: string[],    // 현재 술래
  selectedAngels: string[], // 현재 천사
  gameSettings: { itCount, angelCount, timerSeconds, excludePrevious },
  allItsHistory: string[],  // 전체 술래 이력
}
```

**비즈니스 규칙**:

- Fisher-Yates 셔플 사용 (`UI.shuffleArray`)
- 술래와 천사 중복 불가 (천사 후보에서 술래 제외)
- `excludePrevious=true`: 이전 뽑힌 사람 후보에서 제거
- 3Phase: 설정 → 결과 → 타이머
- 학생 카드 생성 3가지: 번호순, 성별 구분, 학급 불러오기

---

### 3.6 모둠뽑기 도메인 (Group Manager)

**코드 위치**: `group-manager/group-manager.js`(1,021줄), `group-manager-ui.js`(78줄), `group-manager.html`(662줄), `group-manager.css`(362줄)

**엔티티**:

```javascript
Group = { id, name, members[], cookies? }
GroupStats = { totalStudents, averageSize, minSize, maxSize, isBalanced }
```

**비즈니스 규칙**:

- 2가지 모드: 랜덤 셔플 / 고정 모둠
- 고정 모드: 학급 저장 모둠 유지, 순서 셔플 옵션, 리더(첫 번째 학생) ⭐ 표시
- 인원 부족/남음 처리 모달
- 모둠 이름 3가지: 숫자순 / 학급 설정 / 즉석 커스텀
- 2Phase: 설정 → 결과(타이머 토글 가능)

---

### 3.7 배지 시스템 도메인 (Badge)

**코드 위치**: `badge-manager/badge-manager.js`(315줄), `badge-collection-ui.js`(492줄), `badge-config.js`(149줄), `badge.css`(1,395줄)

**엔티티**:

```javascript
// 배지 10종
BADGE_TYPES = { cooperation, respect, consideration, safety, leadership,
                teamwork, fairplay, victory, challenge, positivity }

// XP & 레벨
XP_PER_BADGE = 10
LEVEL_TABLE = [ {level:1, name:'새싹', minXp:0}, ... {level:10, name:'체육왕', minXp:1650} ]

// 온도계
DEFAULT_THERMOSTAT = { targetBadges: 200, milestones: [{temp:20, reward:'야외 수업 1회'}, ...] }
```

**비즈니스 규칙**:

- 배지 부여: 개인 모드 / 모둠 모드
- XP = 배지당 10 (고정), 레벨 10단계 비선형 성장
- 온도계: 학급 전체 배지 수 기준 마일스톤 달성 시 보상
- Firestore 양방향 동기화 (학생 서브컬렉션 badges[] + xp)

---

### 3.8 데이터 저장 도메인 (Storage)

**코드 위치**: `storage/` 7개 파일 + `shared/store.js` Facade (~1,030줄)

**localStorage 키 맵**:
| 키 | 값 | 설명 |
|----|-----|------|
| `pet_classes` | Class[] | 전체 학급 |
| `pet_selected_class` | string | 선택된 학급 ID |
| `pet_tag_game` | TagGameState | 술래뽑기 상태 |
| `pet_current_teams` | Group[] | 모둠 결과 |
| `pet_settings` | AppSettings | 앱 설정 |
| `pet_teacher_profile` | TeacherProfile | 교사 프로필 |
| `pet_badge_log` | BadgeLog[] | 배지 로그 |
| `pet_thermostat` | Object | 온도계 설정 |
| `pet_consent` | Object | 동의 캐시 |

---

### 3.9 Firestore 동기화 도메인

**코드 위치**: `firestore-sync.js`(532줄), `class-firestore.js`(199줄), `firestore-utils.js`(39줄)

**비즈니스 규칙**:

- 2단계 로딩: 학급 문서 먼저(UI 즉시) → 백그라운드 학생 서브컬렉션
- 실시간 `onSnapshot` 리스너
- Firestore 중첩 배열 미지원 → teams JSON.stringify 인코딩
- 모든 호출 `withTimeout(10초)` 래핑

---

## 4. 도메인 간 관계

### 의존성 맵

```
                    ┌──────────┐
                    │  app.js  │ ← 라우터 + 오케스트레이터
                    └────┬─────┘
           ┌─────────┬───┼───┬──────────┬────────────┐
           ▼         ▼   ▼   ▼          ▼            ▼
      ┌────────┐ ┌──────┐┌──────┐ ┌─────────┐  ┌──────────┐
      │ Wizard │ │ Tag  ││Group │ │  Badge  │  │ Consent  │
      │        │ │ Game ││ Mgr  │ │ System  │  │ Manager  │
      └───┬────┘ └──┬───┘└──┬───┘ └────┬────┘  └────┬─────┘
          │         │       │          │             │
          ▼         ▼       ▼          ▼             │
      ┌─────────────────────────────────────┐        │
      │       Class Management              │◄───────┘
      └────────────┬────────────────────────┘
          ┌────────┴───────┐
          ▼                ▼
    ┌──────────┐    ┌───────────────┐
    │  Store   │    │ Firestore     │
    │ (Facade) │    │ Sync          │
    └────┬─────┘    └───────┬───────┘
         ▼                  ▼
    ┌──────────┐    ┌───────────────┐
    │ Repos    │    │ Firebase SDK  │
    └──────────┘    └───────────────┘
```

### 핵심 크로스 도메인 플로우

**1. 앱 부트스트랩**:

```
login.html → AuthManager → index.html → app.js init()
  → mountTemplates() → Store.migrate() → AuthManager.init()
  → FirestoreSync.init() → ConsentManager.ensureConsent()
  → 라우팅 결정
```

**2. 술래뽑기 → 배지 부여**:

```
TagGame 뽑기 완료 → "배지 부여" 클릭
→ BadgeManager.openModal({ preselectedStudentIds, context: 'tag-game' })
→ Store.addBadgeRecords() → FirestoreSync.syncBadgeLogEntries()
→ 'badge-updated' 이벤트 → 도감 갱신
```

**3. 모둠뽑기 → 배지 부여**:

```
GroupManager 모둠 구성 → 모둠 카드 "배지" 클릭
→ BadgeManager.openModal({ mode: 'group', groups, activeGroupId })
→ 해당 모둠원 자동 선택 → (이하 동일)
```

---

## 5. 코드 품질 평가

### 잘 된 부분 ✅

1. **순환 의존성 없음** — 단방향 의존 구조, 이벤트 기반 통신
2. **Repository + Facade 패턴** — 데이터 접근 캡슐화
3. **학급 관리 모듈 분리** — 8개 파일 관심사 분리
4. **JSDoc 타입 정의** — types.js에 모든 엔티티 정의
5. **2단계 Firestore 로딩** — 점진적 로딩 전략
6. **마이그레이션 체계** — 레거시 데이터 대응
7. **검증 유틸리티** — validators.js (Firestore 규칙과 동일 제한)

### 개선 필요 ⚠️

1. **core/ 죽은 코드** — tag-picker.js, group-picker.js 어디서도 import 안 함
2. **중복 코드 ~450줄** — tag-game.js ↔ group-manager.js
   - `createStudentCard()`, `toggleStudentCard()`, `showStudentCardsWrapper()`
   - `openNumberModal()`, `confirmNumberInput()`, `addNumberRange()`, `removeNumberRange()`
   - `openGenderModal()`, `confirmGenderInput()`, `openClassSelectModal()`
3. **God Object** — tag-game.js(893줄), group-manager.js(1,021줄)에 로직+UI+타이머 혼재
4. **타이머 구현 불일치** — tag-game은 setInterval 수동, group-manager는 TimerModule 사용
5. **Store Facade 비대화** — 414줄, 배지 관련 메서드만 12개

---

## 6. Feature Folder 전환 계획

### 목표 구조

```
js/
├── app.js                          ← 변경 없음 (import 경로만 수정)
├── template-loader.js              ← import 경로만 수정
├── types.js
│
├── features/
│   ├── auth/                       ← 인증 + 동의
│   │   ├── auth-manager.js, consent-manager.js, login-main.js
│   │   ├── login.css, consent-modal.html
│   │
│   ├── wizard/                     ← 온보딩
│   │   ├── wizard.js, wizard.css, wizard.html
│   │
│   ├── class/                      ← 학급 관리
│   │   ├── (기존 8개 JS) + HTML 템플릿 5개
│   │
│   ├── tag-game/                   ← 술래뽑기
│   │   ├── tag-game.js, tag-game-ui.js
│   │   ├── tag-game.css, tag-game.html, 모달 3개
│   │
│   ├── group-manager/              ← 모둠뽑기
│   │   ├── group-manager.js, group-manager-ui.js
│   │   ├── group-manager.css, group-manager.html, 모달 4개
│   │
│   ├── badge/                      ← 배지 시스템
│   │   ├── badge-manager.js, badge-collection-ui.js, badge-config.js
│   │   ├── badge.css, badge-collection.html, badge-award-modal.html
│   │
│   └── tools/                      ← 수업 도구 (휘슬/타이머/툴바)
│       ├── whistle.js, quick-timer.js, toolbar.js
│       ├── whistle-fab.html, timer-fab.html, toolbar HTML 2개
│
├── infra/                          ← Firebase
│   ├── firebase-config.js, firestore-sync.js
│
├── shared/                         ← 공용 유틸 (변경 없음)
│   ├── store.js, ui-utils.js, sound.js, timer.js, icons.js, ...
│
└── storage/                        ← Repository (변경 없음)
    ├── base-repo.js, class-repo.js, ...

css/                                ← 공용 CSS만 남김
├── design-system.css, layout.css, animations.css, legal.css

templates/                          ← 공용 레이아웃만 남김
├── navbar.html, footer.html
```

### 전환 7단계

| 단계 | 작업                                | 위험도 | 검증               |
| ---- | ----------------------------------- | ------ | ------------------ |
| 0    | 안전망 (빌드 확인)                  | 없음   | `npm run build`    |
| 1    | features/auth/ 이동                 | 중     | 로그인 + 동의 모달 |
| 2    | infra/ + features/wizard/           | 중     | Firestore + 온보딩 |
| 3    | features/class/                     | 중     | 학급 CRUD + CSV    |
| 4    | features/tag-game/ + group-manager/ | 중     | 뽑기 전체 플로우   |
| 5    | features/badge/ + tools/            | 낮음   | 배지 + 휘슬        |
| 6    | 정리 (core/ 삭제, 빈 폴더 삭제)     | 낮음   | 전체 E2E           |

### 안전 장치

- 매 단계 커밋 (문제 시 한 단계만 롤백)
- 매 단계 `npm run dev` + `npm run build`
- `git mv` 사용 (이동 이력 보존)

### CSS 처리: JS import 방식

```javascript
// 각 feature JS 상단에 추가
import './tag-game.css'; // Vite 자동 번들링
```

→ index.html에서 해당 `<link>` 태그 제거

---

## 7. 후속 작업 (폴더 이동 완료 후)

| 작업                                          | 효과        | 난이도 |
| --------------------------------------------- | ----------- | ------ |
| 중복 코드 제거 (shared/student-card-utils.js) | ~400줄 감소 | 중간   |
| God Object 분리 (tag-game.js → 3-4개 파일)    | 가독성 향상 | 중간   |
| tag-game 타이머 → TimerModule 마이그레이션    | 코드 통일   | 낮음   |
| CLAUDE.md 폴더 구조 업데이트                  | 문서 정합성 | 낮음   |
