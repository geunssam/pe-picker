# 🏗 PePick! 아키텍처

## 📐 전체 구조

PePick!은 **레이어드 아키텍처**를 채택하여 관심사를 명확히 분리합니다.

```
┌─────────────────────────────────────┐
│         Presentation Layer          │  ← HTML, UI Components
├─────────────────────────────────────┤
│        Application Layer            │  ← TagGame, GroupManager
├─────────────────────────────────────┤
│          Domain Layer               │  ← TagPicker, GroupPicker (순수 로직)
├─────────────────────────────────────┤
│       Infrastructure Layer          │  ← Repositories, Storage
└─────────────────────────────────────┘
```

---

## 📦 레이어별 상세

### 1. Presentation Layer (UI)

**역할**: 사용자 인터페이스 렌더링 및 이벤트 처리

**파일**:
- `index.html` - 메인 SPA
- `login.html` - 로그인 페이지
- `css/` - 스타일시트
- `js/*-ui.js` - UI 렌더링 모듈
  - `tag-game-ui.js` - 술래뽑기 결과 표시
  - `group-manager-ui.js` - 모둠 카드 렌더링

**특징**:
- DOM 조작만 담당
- 비즈니스 로직 없음
- UI 유틸리티(`ui-utils.js`) 활용

---

### 2. Application Layer (상태 관리)

**역할**: 애플리케이션 상태 관리 및 워크플로우 제어

**파일**:
- `js/app.js` - 앱 초기화, 라우팅
- `js/tag-game/tag-game.js` - 술래뽑기 상태 관리
- `js/group-manager/group-manager.js` - 모둠뽑기 상태 관리
- `js/shared/class-manager.js` - 학급 UI 로직

**책임**:
- 사용자 액션 처리
- 상태 업데이트
- Core Layer 호출
- UI Layer에 렌더링 요청
- Storage Layer에 저장 요청

**예시**: `tag-game.js`
```javascript
function pickParticipants() {
  // 1. Core Layer 호출 (순수 로직)
  const result = TagPicker.pickItAndAngel({...config});

  // 2. 상태 업데이트
  selectedIts = result.its;
  selectedAngels = result.angels;

  // 3. UI 렌더링
  TagGameUI.renderResultCards(selectedIts, selectedAngels);

  // 4. Storage 저장
  Store.saveTagGameData({...state});
}
```

---

### 3. Domain Layer (핵심 로직)

**역할**: 순수 비즈니스 로직 (UI, 상태, 저장소 독립)

**파일**:
- `js/core/tag-picker.js` - 술래/천사 뽑기 알고리즘
- `js/core/group-picker.js` - 모둠 배정 알고리즘

**특징**:
- **순수 함수**: 같은 입력 → 같은 출력
- **부수효과 없음**: DOM, localStorage 접근 안 함
- **테스트 용이**: 독립적으로 테스트 가능

**예시**: `tag-picker.js`
```javascript
// 순수 함수 - 외부 의존성 없음
function pickItAndAngel(config) {
  const { itCount, participants, ... } = config;

  // 알고리즘만 수행
  const its = pickGroup(itCount, availablePool, participants);

  return { its, angels, ... };
}
```

---

### 4. Infrastructure Layer (저장소)

**역할**: 데이터 영속성 관리

**파일**:
- `js/storage/base-repo.js` - localStorage 공통 헬퍼
- `js/storage/class-repo.js` - 학급 CRUD
- `js/storage/tag-game-repo.js` - 술래뽑기 상태
- `js/storage/group-manager-repo.js` - 모둠 상태 + 쿠키
- `js/storage/settings-repo.js` - 설정
- `js/storage/teacher-repo.js` - 교사 프로필

**Facade 패턴**:
```javascript
// js/shared/store.js
const Store = (() => {
  function getClasses() {
    return ClassRepo.getAll(); // Repository 위임
  }

  return { getClasses, ... };
})();
```

**장점**:
- 저장소 교체 용이 (localStorage → Firebase)
- Repository 단위로 교체 가능
- 기존 API 유지

---

## 🔄 데이터 흐름

### 술래뽑기 예시

```
User Action (버튼 클릭)
   ↓
┌──────────────────────────────────┐
│  Application Layer               │
│  TagGame.pickParticipants()      │
│    - 현재 상태 수집              │
│    - Core Layer 호출              │
└──────────────────────────────────┘
   ↓
┌──────────────────────────────────┐
│  Domain Layer                    │
│  TagPicker.pickItAndAngel()      │
│    - 순수 알고리즘 수행          │
│    - 결과 반환                    │
└──────────────────────────────────┘
   ↓
┌──────────────────────────────────┐
│  Application Layer               │
│    - 결과를 상태에 저장          │
│    - UI Layer 호출                │
│    - Storage Layer 호출           │
└──────────────────────────────────┘
   ↓                    ↓
┌─────────────┐  ┌──────────────┐
│ UI Layer    │  │ Storage      │
│ 화면 갱신    │  │ 데이터 저장   │
└─────────────┘  └──────────────┘
```

---

## 🗂 파일 구조 상세

### `/js/storage/` - 저장소 계층

```
storage/
├── base-repo.js          # localStorage 공통 함수
│   ├── get(key)         # 데이터 읽기
│   ├── set(key, value)  # 데이터 쓰기
│   └── remove(key)      # 데이터 삭제
│
├── class-repo.js         # 학급 관리
│   ├── getAll()         # 모든 학급
│   ├── getById(id)      # 학급 조회
│   ├── create(...)      # 학급 생성
│   ├── update(...)      # 학급 수정
│   └── remove(id)       # 학급 삭제
│
├── tag-game-repo.js      # 술래뽑기 상태
│   ├── getData()        # 상태 읽기
│   ├── saveData(data)   # 상태 저장
│   └── clear()          # 상태 초기화
│
└── ... (다른 repo 동일 패턴)
```

### `/js/core/` - 도메인 로직

```
core/
├── tag-picker.js         # 술래/천사 뽑기 알고리즘
│   ├── pickGroup()      # 기본 뽑기
│   ├── pickItAndAngel() # 술래+천사 동시 뽑기
│   ├── resetPools()     # 후보 풀 리셋
│   └── shuffle()        # 셔플 알고리즘
│
└── group-picker.js       # 모둠 배정 알고리즘
    ├── assignRandom()   # 랜덤 배정
    ├── assignFixed()    # 고정 모둠
    ├── assign()         # 자동 선택
    └── getStats()       # 통계
```

### `/js/shared/` - 공통 모듈

```
shared/
├── store.js              # Facade (모든 repo 통합)
├── ui-utils.js           # UI 유틸리티
│   ├── showToast()      # 토스트 메시지
│   ├── showModal()      # 모달 제어
│   ├── shuffleArray()   # 배열 셔플
│   └── escapeHtml()     # XSS 방지
│
├── class-manager.js      # 학급 UI 관리
├── sound.js              # 사운드 효과
├── timer.js              # 타이머 모듈
└── ios-utils.js          # iOS 최적화
```

---

## 🔧 디자인 패턴

### 1. Facade Pattern (Store)

**목적**: 복잡한 Repository를 단순한 API로 통합

```javascript
const Store = (() => {
  // ClassRepo, TagGameRepo 등을 통합
  function getClasses() {
    return ClassRepo.getAll();
  }

  return { getClasses, ... };
})();
```

### 2. Repository Pattern

**목적**: 데이터 접근 로직 캡슐화

```javascript
const ClassRepo = (() => {
  function getAll() {
    return BaseRepo.get(KEYS.CLASSES) || [];
  }

  return { getAll, ... };
})();
```

### 3. Module Pattern (IIFE)

**목적**: 전역 스코프 오염 방지, 캡슐화

```javascript
const TagPicker = (() => {
  // private
  function shuffle(array) { ... }

  // public
  return { pickItAndAngel };
})();
```

---

## 🔐 보안 고려사항

### XSS 방어

모든 사용자 입력은 `UI.escapeHtml()` 처리:

```javascript
// Before (위험)
container.innerHTML = `<div>${userName}</div>`;

// After (안전)
container.innerHTML = `<div>${UI.escapeHtml(userName)}</div>`;
```

### localStorage 키 네임스페이스

```javascript
const PREFIX = 'pet_';  // 다른 앱과 충돌 방지
const KEYS = {
  CLASSES: `${PREFIX}classes`,
  TAG_GAME: `${PREFIX}tag_game`,
  ...
};
```

---

## 🚀 Firebase 전환 계획

### 현재 (Local-First)

```
User → Application → Storage (localStorage)
```

### 향후 (Firebase)

```
User → Application → Storage (Firestore)
                   ↘ Auth (Firebase Auth)
```

**변경 범위**:
- `storage/*.js` 파일만 교체
- 나머지 레이어는 그대로 유지
- Store API 호환성 유지

---

## 📊 타입 시스템

`js/types.js`에 JSDoc으로 정의:

```javascript
/**
 * @typedef {Object} Student
 * @property {string} id
 * @property {string} name
 * @property {number} number
 * ...
 */
```

**장점**:
- VS Code 자동완성
- 타입 �힌트
- 문서화

---

## 🧪 테스트 전략 (향후)

### 1. Core Layer 단위 테스트

```javascript
test('pickGroup should return correct number', () => {
  const result = TagPicker.pickGroup(3, students, students);
  expect(result.finalGroup.length).toBe(3);
});
```

### 2. Integration 테스트

```javascript
test('TagGame flow works end-to-end', () => {
  TagGame.init();
  TagGame.pickParticipants();
  expect(Store.getTagGameData()).toBeTruthy();
});
```

---

## 📝 코드 품질

### ESLint 규칙

- 세미콜론 필수
- 싱글 쿼트
- 2칸 들여쓰기
- 미사용 변수 경고

### Prettier 규칙

- 최대 라인 100자
- 세미콜론 추가
- 트레일링 콤마 (ES5)

---

## 🔄 향후 개선 사항

1. **TypeScript 전환** (선택)
2. **단위 테스트 추가**
3. **Firebase 실제 연결**
4. **PWA 최적화**
5. **CI/CD 구축**

---

**작성일**: 2025-02-12
**버전**: 1.0.0
