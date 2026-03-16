# PEPick! 상업화 종합 컨설팅 — 실행 계획서

> 작성일: 2026-02-22
> 작성: Claude Code (AI 아키텍처 분석)
> 대상: PEPick! — 초등 체육 수업용 술래뽑기 + 모둠뽑기 PWA

---

## Context

PEPick!은 초등 체육 수업용 술래뽑기 + 모둠뽑기 PWA(Vanilla JS + Firebase)입니다.
Netlify에 배포 중이며, 핵심 기능이 동작하는 상태입니다.
이 문서는 **코드 수정, 보안 강화, 결제 연동, 테스트 환경 구축**까지 포함한 실행 계획서입니다.

---

## 1. 현재 상태 종합 평가

| 영역            | 점수   | 핵심 평가                           |
| --------------- | ------ | ----------------------------------- |
| 알고리즘 신뢰성 | 9/10   | Fisher-Yates 기반, 공정성 완벽      |
| UI/UX 디자인    | 8.5/10 | Glass Morphism, 모바일 최적화       |
| 아키텍처        | 7.5/10 | Store Facade + Repository 패턴 양호 |
| 보안            | 5/10   | Firestore 규칙 검증 부족            |
| 확장성          | 5.5/10 | N+1 쿼리, 다중 사용자 미지원        |
| 테스트/안정성   | 3/10   | 테스트 0개, 에러 핸들링 미흡        |

**상업화 준비도: 5.5/10**

---

## 2. 상업화 전 법적 요건 (코드 작업 이전에 확인 필수)

### 2.1 교육공무원 겸직허가

초등 교사(교육공무원)가 앱으로 수익을 올리려면 **겸직허가가 필수**입니다.

**절차:**

1. 소속 학교에 **겸직허가 신청서** 제출
2. 내용: "교육용 앱(PEPick!) 개발 및 운영으로 인한 수익 활동"
3. 학교 내 **겸직심사위원회** 심사 → 담당 직무에 지장 없으면 허가
4. 허가 후 **개인사업자 등록** (토스페이먼츠에서 5분 내 등록 가능)

> 참고: 2023년 기준 겸직허가를 받은 교원 중 수익 발생 교원은 9,845명(81.2%)으로 점점 보편화 추세

### 2.2 학생 개인정보 — 가장 중요한 법적 이슈

PEPick!은 학생 이름을 다루므로 **개인정보보호법** 준수 필수 (초등학생 = 만 14세 미만).

**권장 전략: "개인정보 비수집" 모델**

- 학생 데이터는 **교사 기기의 localStorage에만 저장** (서버 미전송)
- Firestore 동기화 시 학생 이름을 **암호화 또는 해시화**
- 앱 내에 "개인정보를 서버에 수집하지 않습니다" 명시
- 이름 대신 **번호만 사용하는 모드** 추가 제공

**구현 방법 (코드 수정):**

- `js/firestore-sync.js` — 학생 이름 업로드 시 암호화 레이어 추가
- `js/class-management/class-firestore.js` — Firestore 저장 전 이름 마스킹 옵션
- 설정 페이지에 "클라우드 동기화 시 이름 암호화" 토글 추가

### 2.3 개인정보 수집/이용 동의 모달 (필수 구현)

**요구사항:** 새로운 로그인 감지 시 개인정보 동의 모달을 띄우고, 동의해야만 앱 진행 가능.

**삽입 위치: `js/app.js`의 `onAuthStateChanged()` → `bootstrapAfterAuth()` 사이**

현재 흐름:

```
onAuthStateChanged() → user 감지 → bootstrapAfterAuth()
```

변경 후 흐름:

```
onAuthStateChanged() → user 감지 → 동의 여부 확인
  ├─ 이미 동의함 → bootstrapAfterAuth()
  └─ 미동의 → 동의 모달 표시 → 동의 클릭 → Firestore 저장 → bootstrapAfterAuth()
                              → 거부 클릭 → 로그아웃 + login.html 이동
```

**수정할 파일들:**

1. **새 파일: `templates/modals/privacy-consent.html`**
   - 개인정보 수집/이용 동의 내용 (수집 항목, 목적, 보유기간)
   - "동의합니다" / "동의하지 않습니다" 버튼
   - 전문 보기 링크 (개인정보처리방침 페이지로 연결)

2. **수정: `js/template-loader.js`**
   - `privacy-consent.html` import 추가

3. **수정: `js/app.js`의 `onAuthStateChanged()`**

```javascript
async function onAuthStateChanged() {
  const user = AuthManager.getCurrentUser();
  if (!user) {
    if (!isLoginPage()) window.location.replace('login.html');
    return;
  }

  // 개인정보 동의 여부 확인
  const hasConsented = await checkPrivacyConsent(user.uid);
  if (!hasConsented) {
    const agreed = await showPrivacyConsentModal();
    if (!agreed) {
      // 거부 시 로그아웃
      await AuthManager.signOut();
      window.location.replace('login.html');
      return;
    }
    // 동의 시 Firestore에 기록
    await savePrivacyConsent(user.uid);
  }

  bootstrapAfterAuth();
}
```

4. **새 파일: `js/privacy-consent.js`**
   - `checkPrivacyConsent(uid)` — Firestore `users/{uid}.privacyConsented` 확인
   - `showPrivacyConsentModal()` — Promise 반환 (동의=true, 거부=false)
   - `savePrivacyConsent(uid)` — Firestore에 동의 시각 저장

5. **Firestore 데이터 구조 추가:**

```javascript
// users/{uid} 문서에 추가
{
  privacyConsented: true,
  privacyConsentedAt: Timestamp,  // 동의 시각
  privacyVersion: '1.0',         // 약관 버전 (버전 변경 시 재동의 요청)
}
```

6. **새 파일: `public/privacy-policy.html`** (또는 별도 URL)
   - 개인정보처리방침 전문
   - 수집 항목: 이름(Google 계정), 이메일, 프로필 사진
   - 수집 목적: 서비스 제공, 데이터 동기화
   - 보유 기간: 회원 탈퇴 시까지
   - 제3자 제공: 없음

**동의 모달 내용 예시:**

```
PEPick! 개인정보 수집 및 이용 동의

1. 수집 항목: Google 계정 이름, 이메일, 프로필 사진
2. 수집 목적: 로그인 및 데이터 동기화
3. 보유 기간: 회원 탈퇴 시 즉시 삭제
4. 학생 정보: 교사 기기에만 저장되며, 클라우드 동기화 시 암호화 처리

※ 동의를 거부할 수 있으나, 거부 시 서비스 이용이 제한됩니다.

[전문 보기]  [동의합니다]  [동의하지 않습니다]
```

---

## 3. 코드 수정 계획 — 위험도 순

### Phase 1: 보안/안정성 확보 (1~2주, ~18시간)

#### 3.1 🔴 Firebase 환경변수 전환 (30분)

**현재 문제:** `js/firebase-config.js`에 API 키 하드코딩

**수정할 파일:**

1. **새 파일 생성: `.env.local`** (로컬 개발용)

```
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

2. **수정: `js/firebase-config.js`** — 하드코딩 값을 `import.meta.env.VITE_*`로 교체

```javascript
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  // ... 나머지도 동일하게
};
```

3. **수정: `.gitignore`** — `.env.local` 이미 포함되어 있는지 확인 (포함됨 ✅)

4. **Netlify 환경변수 설정** — Netlify 대시보드 > Site settings > Environment에 동일 변수 추가

> 참고: Firebase Web API Key는 설계상 클라이언트에 노출되는 것이 정상이지만, 환경변수로 관리하면 프로젝트별 분리(dev/staging/prod)가 가능해짐

#### 3.2 🔴 Firestore 보안 규칙 강화 (2시간)

**현재:** 인증만 확인, 데이터 검증 없음

**수정할 파일: `firestore.rules`**

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function isValidStudent(data) {
      return data.keys().hasAll(['name', 'number'])
        && data.name is string && data.name.size() < 50
        && data.number is number && data.number >= 0 && data.number <= 99
        && (!('gender' in data) || data.gender in ['M', 'F', ''])
        && (!('xp' in data) || (data.xp is number && data.xp >= 0))
        && request.resource.size() < 50000;  // 50KB 문서 제한
    }

    function isValidClass(data) {
      return data.keys().hasAll(['name'])
        && data.name is string && data.name.size() < 100
        && (!('teamCount' in data) || (data.teamCount is number
            && data.teamCount >= 1 && data.teamCount <= 20))
        && request.resource.size() < 100000;  // 100KB 제한
    }

    match /users/{userId} {
      allow read: if request.auth.uid == userId;
      allow write: if request.auth.uid == userId
                   && request.resource.size() < 50000;

      match /classes/{classId} {
        allow read: if request.auth.uid == userId;
        allow create, update: if request.auth.uid == userId
                              && isValidClass(request.resource.data);
        allow delete: if request.auth.uid == userId;

        match /students/{studentId} {
          allow read: if request.auth.uid == userId;
          allow create, update: if request.auth.uid == userId
                                && isValidStudent(request.resource.data);
          allow delete: if request.auth.uid == userId;
        }
      }
    }

    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

**배포:** `firebase deploy --only firestore:rules`

#### 3.3 🔴 N+1 쿼리 최적화 (4시간)

**현재 문제:** `js/firestore-sync.js:177-182` — 클래스마다 학생 서브컬렉션 개별 조회

**수정할 파일: `js/firestore-sync.js`**

**전략:** "로컬 우선 + 지연 동기화"

- 초기 로드: localStorage에서 학생 데이터를 먼저 표시
- 백그라운드: Firestore에서 학생 데이터를 비동기로 가져와 병합
- 변경 시: 로컬 저장 → Firestore에 배치 업로드

**핵심 변경:**

```javascript
// 변경 전: 매번 N+1 쿼리
const classes = await Promise.all(
  snap.docs.map(async docItem => {
    const subStudents = await hydrateStudentsFromFirestore(docItem.id);
    return normalizeClassFromSnapshot(docItem.id, data, subStudents);
  })
);

// 변경 후: 클래스 메타데이터만 Firestore에서, 학생은 로컬 우선
const classes = snap.docs.map(docItem => {
  const localStudents = Store.getStudentsByClassId(docItem.id);
  return normalizeClassFromSnapshot(docItem.id, data, localStudents);
});
// 백그라운드에서 학생 동기화 (순차, 디바운스)
queueBackgroundStudentSync(snap.docs.map(d => d.id));
```

#### 3.4 🟡 에러 핸들링 시스템 (3시간)

**수정할 파일들:**

- `js/firestore-sync.js` — Firestore 에러 시 이벤트 발행
- `js/shared/ui-utils.js` — 에러 토스트 강화
- `js/app.js` — 전역 에러 리스너 등록

**핵심 변경:**

```javascript
// firestore-sync.js — 에러 발생 시
window.dispatchEvent(
  new CustomEvent('sync-error', {
    detail: { message: '데이터 동기화에 실패했습니다', error },
  })
);

// app.js — 전역 리스너
window.addEventListener('sync-error', e => {
  UI.showToast(e.detail.message, 'error');
});
```

#### 3.5 🟡 localStorage 용량 관리 (1시간)

**수정할 파일: `js/storage/base-repo.js`**

```javascript
export function set(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    if (e.name === 'QuotaExceededError') {
      // 오래된 배지 로그 50% 삭제 후 재시도
      const logs = JSON.parse(localStorage.getItem(KEYS.BADGE_LOG) || '[]');
      const trimmed = logs.slice(Math.floor(logs.length / 2));
      localStorage.setItem(KEYS.BADGE_LOG, JSON.stringify(trimmed));
      UI.showToast('저장 공간 부족 — 오래된 기록을 정리했습니다', 'warning');
      localStorage.setItem(key, JSON.stringify(value)); // 재시도
    }
  }
}
```

#### 3.6 🟡 배지 스키마 통일 (2시간)

**수정할 파일들:**

- `js/storage/badge-repo.js` — 필드명을 Firestore 기준으로 통일
- `js/firestore-sync.js` — 변환 로직 제거
- `js/badge-manager/badge-manager.js` — 새 스키마 적용

**통일 스키마:**

```javascript
// 배지 기록 표준 형식
{
  id: string,
  badgeType: string,    // 통일 (기존 Firestore: 'type')
  timestamp: number,     // 통일 (기존 Firestore: 'date')
  classId: string,
  studentId: string,
  xp: number,
  context: string,
  team: string
}
```

---

### Phase 2: 테스트 환경 + 코드 품질 (2~4주, ~25시간)

#### 3.7 🔴 테스트 환경 구축 가이드 (8시간)

**Step 1: Vitest 설치 및 설정**

```bash
cd /Users/iwongeun/Desktop/PEPick
npm install --save-dev vitest jsdom @vitest/coverage-v8
```

**새 파일 생성: `vitest.config.js`**

```javascript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['js/core/**', 'js/shared/**', 'js/storage/**'],
    },
  },
});
```

**수정: `package.json`에 스크립트 추가**

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage"
  }
}
```

**테스트 파일 생성 (우선순위순):**

- `js/core/__tests__/tag-picker.test.js` — 술래뽑기 알고리즘 공정성 검증
- `js/core/__tests__/group-picker.test.js` — 모둠뽑기 균형 검증
- `js/shared/__tests__/ui-utils.test.js` — escapeHtml, shuffleArray
- `js/storage/__tests__/store.test.js` — CRUD + 마이그레이션

#### 3.8 Firebase 에뮬레이터 설정 가이드

로컬에서 Firestore/Auth를 테스트하기 위한 환경입니다.

**Step 1: Java 21 설치 확인**

```bash
java --version
# 21 이상 필요. 없으면:
brew install openjdk@21
```

**Step 2: Firebase 에뮬레이터 초기화**

```bash
cd /Users/iwongeun/Desktop/PEPick
firebase init emulators
# Firestore ✅, Authentication ✅ 선택
# 기본 포트 사용 (Firestore: 8080, Auth: 9099, UI: 4000)
```

**Step 3: 에뮬레이터 실행**

```bash
firebase emulators:start
# http://localhost:4000 에서 에뮬레이터 UI 접속
```

**Step 4: 코드에서 에뮬레이터 자동 연결**

**수정: `js/firebase-config.js`에 추가:**

```javascript
// 로컬 개발 시 에뮬레이터 사용
if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
  const { connectFirestoreEmulator } =
    await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
  const { connectAuthEmulator } =
    await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js');
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
  connectAuthEmulator(auth, 'http://127.0.0.1:9099');
  console.log('[Firebase] 에뮬레이터 연결됨');
}
```

#### 3.9 Netlify 스테이징 환경 구축 가이드

프로덕션 배포 전 테스트할 수 있는 별도 URL을 만듭니다.

**Step 1: staging 브랜치 생성**

```bash
git checkout -b staging
git push -u origin staging
```

**Step 2: Firebase 스테이징 프로젝트 생성**

```bash
firebase projects:create pepick-iwg-staging --display-name "PePick Staging"
```

**Step 3: Netlify Branch Deploy 설정**

Netlify 대시보드에서:

1. Site configuration > Build & deploy > Branches and deploy contexts
2. "Branch deploys" → "Let me add individual branches" 선택
3. `staging` 추가

**결과:**

- 프로덕션: `your-site.netlify.app` (main 브랜치)
- 스테이징: `staging--your-site.netlify.app` (staging 브랜치)

**Step 4: 브랜치별 환경변수**

Netlify 대시보드 > Environment variables:

- `VITE_FIREBASE_PROJECT_ID` = `pepick-iwg` (프로덕션)
- `VITE_FIREBASE_PROJECT_ID` = `pepick-iwg-staging` (staging 스코프)

#### 3.10 코드 중복 해소 — 타이머/모달 통합 (6시간)

**수정할 파일들:**

- 새 파일: `js/shared/timer-manager.js` — 타이머 통합 클래스
- 새 파일: `js/shared/modal-manager.js` — 모달 열기/닫기 표준화
- `js/tag-game/tag-game.js` — 내장 타이머 코드 제거, TimerManager 사용
- `js/group-manager/group-manager.js` — 동일하게 적용

#### 3.11 대형 파일 분할 (8시간)

**tag-game.js (893줄) 분할:**

```
tag-game/
├── tag-game.js          → 진입점 (init, 이벤트 바인딩만)
├── tag-game-state.js    → 상태 변수 + 상태 변경 함수
├── tag-game-ui.js       → 기존 유지 (렌더링)
└── tag-game-phase.js    → Phase 1/2/3 전환 로직
```

**layout.css (3,015줄) 분할:**

```
css/
├── layout/
│   ├── navbar.css       → 네비바 스타일
│   ├── pages.css        → 페이지 공통
│   ├── modals.css       → 모달 공통
│   └── utilities.css    → 헬퍼 클래스
```

---

### Phase 3: 결제 시스템 + 프리미엄 기능 (1~2개월)

#### 3.12 결제 시스템 연동 — 토스페이먼츠 (권장)

**결정된 비즈니스 모델:** 유료 구독 (~1,000원/월)

- **1단계**: PWA + 웹 결제 (토스페이먼츠)
- **2단계**: App Store + Play Store 출시 (Capacitor로 래핑, 인앱결제 전환)

**왜 토스페이먼츠인가 (1단계 PWA용):**

- 한국 시장 1순위 PG, 수수료 3.3~4.3%
- 개발 문서 한국어 완벽, 테스트 모드 무료
- 결제위젯이 UI까지 제공 → 프론트엔드 공수 최소
- PWA이므로 앱스토어 수수료(15~30%) 없이 직접 결제 가능

> Stripe는 한국 사업자 직접 사용 불가. 포트원은 추가 수수료(0.5%) 발생. Paddle은 수수료 높음(5%+$0.50).

**연동 절차:**

**Step 1: 토스페이먼츠 가입**

1. https://www.tosspayments.com 접속
2. 사업자등록 후 가입 (겸직허가 + 사업자등록 선행 필수)
3. 테스트 모드 API 키 발급 (가입 즉시)

**Step 2: 결제위젯 SDK 추가**

**수정: `index.html`에 SDK 스크립트 추가:**

```html
<script src="https://js.tosspayments.com/v2/standard"></script>
```

**Step 3: 결제 페이지 구현**

**새 파일: `templates/pages/subscription.html`**
— 구독 플랜 선택 UI + 결제위젯 마운트 영역

**새 파일: `js/payment/payment-manager.js`**

```javascript
// 토스페이먼츠 결제위젯 초기화
const clientKey = import.meta.env.VITE_TOSS_CLIENT_KEY;
const widgets = TossPayments(clientKey).widgets({ customerKey: userId });
await widgets.setAmount({ value: 1000, currency: 'KRW' });
await widgets.renderPaymentMethods({ selector: '#payment-method' });
await widgets.renderAgreement({ selector: '#agreement' });

// 결제 요청
await widgets.requestPayment({
  orderId: `pepick_pro_${Date.now()}`,
  orderName: 'PEPick! Pro 월간 구독',
  successUrl: `${location.origin}/payment-success`,
  failUrl: `${location.origin}/payment-fail`,
});
```

**Step 4: 결제 확인 (서버리스)**

**백엔드가 없으므로 Netlify Functions 사용:**

**새 파일: `netlify/functions/confirm-payment.js`**

```javascript
// 토스페이먼츠 결제 승인 API 호출
// 결과를 Firestore users/{uid} 문서에 구독 상태 저장
export async function handler(event) {
  const { paymentKey, orderId, amount } = JSON.parse(event.body);

  // 토스페이먼츠 결제 승인 API
  const response = await fetch('https://api.tosspayments.com/v1/payments/confirm', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${btoa(TOSS_SECRET_KEY + ':')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ paymentKey, orderId, amount }),
  });

  // Firestore에 구독 상태 업데이트
  // ...
}
```

**Step 5: 구독 상태 관리**

**수정: `js/firestore-sync.js`**
— `users/{userId}` 문서에 구독 정보 필드 추가:

```javascript
{
  subscription: {
    plan: 'pro',           // 'free' | 'pro'
    expiresAt: Timestamp,  // 만료일
    paymentId: string,     // 결제 ID
  }
}
```

**수정: `js/shared/store.js`**
— `Store.isPro()` 함수 추가 → 프리미엄 기능 분기에 사용

#### 3.13 프리미엄(Freemium) 기능 분기

**무료 vs Pro 기능 분류:**

| 기능          | Free             | Pro (1,000원/월)                |
| ------------- | ---------------- | ------------------------------- |
| 학급 수       | 2개              | 무제한                          |
| 술래뽑기      | 기본             | 고급 애니메이션 + 효과음 커스텀 |
| 모둠뽑기      | 기본 (4모둠까지) | 무제한 + 성별/능력 균형         |
| 배지 시스템   | 기본 배지 5종    | 전체 10종 + 커스텀 배지         |
| 데이터 동기화 | 기기 1대 (로컬)  | 클라우드 동기화                 |
| 통계/리포트   | 없음             | 공정성 리포트 + 통계            |

**가격 모델 (확정 방향):**

- **월간:** 1,000원/월 (교사 부담 최소화)
- **연간:** 9,900원/년 (월 ~825원, 17% 할인)
- 앱스토어 출시 시 동일 가격 유지 (인앱결제로 전환)

> 참고: 1,000원/월은 초등 교사가 부담 없이 결제할 수 있는 심리적 마지노선.
> "다했니" 앱은 핵심 무료 + AI만 유료. PEPick!은 저렴한 구독으로 진입장벽을 낮추는 전략.

**구현 방법:**

**새 파일: `js/shared/feature-gate.js`**

```javascript
export function requirePro(featureName) {
  if (!Store.isPro()) {
    UI.showModal('upgrade-modal'); // "Pro로 업그레이드" 안내
    return false;
  }
  return true;
}
```

**적용 예시:**

```javascript
// group-manager.js — 성별 균형 기능
if (!requirePro('성별 균형 모둠뽑기')) return;
```

#### 3.14 성별/능력 균형 알고리즘 (6시간) — Pro 기능

**새 파일: `js/core/balanced-group-picker.js`**

```javascript
export function assignBalancedGroups(students, teamCount, options = {}) {
  const { balanceGender = true, balanceAbility = false } = options;

  // 1. 성별별 학생 분류
  const males = students.filter(s => s.gender === 'M');
  const females = students.filter(s => s.gender === 'F');

  // 2. 각 성별을 셔플 후 라운드 로빈으로 배분
  const shuffledM = UI.shuffleArray([...males]);
  const shuffledF = UI.shuffleArray([...females]);

  const groups = Array.from({ length: teamCount }, () => []);
  let idx = 0;
  for (const student of [...shuffledM, ...shuffledF]) {
    groups[idx % teamCount].push(student);
    idx++;
  }

  return groups;
}
```

#### 3.15 통계/리포트 기능 (8시간) — Pro 기능

**새 파일: `templates/pages/statistics.html`** — 통계 페이지 UI
**새 파일: `js/statistics/statistics-manager.js`** — 데이터 집계
**수정: `js/app.js`** — 라우팅에 `statistics` 추가

---

## 4. API 키 및 서비스 발급 가이드

### 4.1 현재 보유 중인 API/서비스

| 서비스                | 상태    | 비고               |
| --------------------- | ------- | ------------------ |
| Firebase (pepick-iwg) | ✅ 활성 | Auth + Firestore   |
| Netlify               | ✅ 활성 | 배포 중            |
| GitHub                | ✅ 활성 | geunssam/pe-picker |

### 4.2 새로 발급/설정해야 할 것

#### A. Firebase 스테이징 프로젝트

```bash
# 1. 프로젝트 생성
firebase projects:create pepick-iwg-staging

# 2. Auth 활성화 (Firebase Console에서)
# pepick-iwg-staging → Authentication → Sign-in method → Google 활성화

# 3. Firestore 활성화
# pepick-iwg-staging → Firestore Database → Create database → nam5

# 4. 보안 규칙 배포
firebase use pepick-iwg-staging
firebase deploy --only firestore:rules
```

#### B. 토스페이먼츠 (결제 준비 단계)

1. https://www.tosspayments.com 가입
2. 테스트 모드 API 키 발급 (무료, 사업자등록 전에도 가능)
   - **클라이언트 키** (프론트엔드용): `test_ck_...`
   - **시크릿 키** (서버용): `test_sk_...`
3. 환경변수에 추가:
   ```
   VITE_TOSS_CLIENT_KEY=test_ck_...
   TOSS_SECRET_KEY=test_sk_...  # Netlify Functions용 (서버사이드)
   ```

#### C. Netlify Functions 설정

```bash
# 1. Netlify CLI 설치 확인
netlify --version

# 2. Functions 디렉토리 생성
mkdir -p netlify/functions

# 3. netlify.toml에 추가
[functions]
  directory = "netlify/functions"
```

#### D. 커스텀 도메인 (선택)

- Netlify 대시보드 > Domain management > Add custom domain
- 예: `pepick.kr` 또는 `pepick.app`
- `.kr` 도메인: 약 15,000원/년 (가비아, 호스팅KR)
- `.app` 도메인: 약 20,000원/년 (Google Domains → Squarespace)

---

## 5. 실행 로드맵 요약

### Phase 0: 법적 준비 (1~2개월)

- [ ] 겸직허가 신청 및 승인
- [ ] 개인사업자 등록
- [ ] 개인정보처리방침 작성

### Phase 1: 보안/안정성 확보 (1~2주, ~18시간)

- [ ] `.env.local` 생성 + `firebase-config.js` 환경변수 전환
- [ ] `firestore.rules` 데이터 검증 규칙 추가 → 배포
- [ ] `firestore-sync.js` N+1 쿼리 → 로컬 우선 전략
- [ ] 에러 핸들링 시스템 (sync-error 이벤트 + 토스트)
- [ ] `base-repo.js` QuotaExceededError 처리
- [ ] 배지 스키마 통일 (필드명 일원화)
- [ ] **개인정보 수집/이용 동의 모달** (privacy-consent.html + privacy-consent.js)
- [ ] **개인정보처리방침 페이지** (privacy-policy.html)

### Phase 2: 테스트/코드 품질 (2~4주, ~25시간)

- [ ] Vitest 설치 + 테스트 파일 작성 (core/ 우선)
- [ ] Firebase 에뮬레이터 설정 (Java 21 + `firebase init emulators`)
- [ ] Netlify staging 브랜치 배포 환경 구축
- [ ] 타이머/모달 코드 통합 (TimerManager, ModalManager)
- [ ] 대형 파일 분할 (tag-game.js, layout.css)

### Phase 3: 결제 + 프리미엄 (1~2개월, ~25시간)

- [ ] 토스페이먼츠 가입 + 테스트 키 발급
- [ ] 결제위젯 연동 + Netlify Functions 백엔드
- [ ] Firestore에 구독 상태 관리
- [ ] Free/Pro 기능 분기 (feature-gate.js)
- [ ] 성별/능력 균형 알고리즘 (Pro 기능)
- [ ] 통계/리포트 페이지 (Pro 기능)

### Phase 4: PWA 런칭 (2~4주)

- [ ] 베타 테스터 모집 (인디스쿨, 참쌤스쿨 커뮤니티)
- [ ] 피드백 수집 + 개선
- [ ] 정식 구독 출시 (1,000원/월)

### Phase 5: 앱스토어 출시 (Phase 4 이후, 별도 일정)

**Capacitor로 PWA → 네이티브 앱 변환:**

PWA 코드를 거의 그대로 사용하면서 App Store / Play Store에 출시할 수 있습니다.

**Step 1: Capacitor 설치**

```bash
npm install @capacitor/core @capacitor/cli
npx cap init PEPick com.pepick.app --web-dir dist
```

**Step 2: 플랫폼 추가**

```bash
npx cap add ios      # iOS (Xcode 필요)
npx cap add android  # Android (Android Studio 필요)
```

**Step 3: 빌드 → 네이티브 프로젝트 동기화**

```bash
npm run build        # Vite 빌드
npx cap sync         # dist/ → 네이티브 프로젝트 복사
npx cap open ios     # Xcode 열기
npx cap open android # Android Studio 열기
```

**Step 4: 인앱결제 전환**

- 앱스토어 출시 시 토스페이먼츠 → 인앱결제로 전환 필수
- Apple: 30% (소규모 개발자 15%), Google: 15%
- Capacitor 인앱결제 플러그인: `@capawesome-team/capacitor-purchases` (RevenueCat 연동)

**Step 5: 스토어 출시 준비**

| 항목            | Apple App Store    | Google Play Store        |
| --------------- | ------------------ | ------------------------ |
| 개발자 등록비   | $99/년 (약 13만원) | $25 (1회, 약 3.3만원)    |
| 심사 기간       | 1~3일              | 수 시간~2일              |
| 필요 장비       | Mac (Xcode)        | 아무 PC (Android Studio) |
| 인앱결제 수수료 | 15% (소규모)       | 15%                      |
| 개인정보 라벨   | 필수 작성          | 필수 작성                |

**앱스토어 출시 시 주의사항:**

- 인앱결제 외 외부 결제 유도 금지 (Apple 정책)
- 1,000원/월 구독 → Apple/Google 수수료 후 실수령 ~850원
- 앱 심사 시 개인정보처리방침 URL 필수
- iOS는 Mac이 있어야 빌드 가능 (현재 MacBook Pro M4 Pro 보유 ✅)

**총 예상 작업량: ~68시간 (Phase 1~4 코드) + 법적 절차 별도**
**Phase 5 추가 작업량: ~15시간 (Capacitor 래핑 + 스토어 등록)**

---

## 6. 비용 전망

### 운영 비용 (월간)

| 규모 | 교사 수   | Firestore | Netlify | 도메인 | 합계     |
| ---- | --------- | --------- | ------- | ------ | -------- |
| 초기 | ~100명    | $0        | $0      | ~$1    | **~$1**  |
| 성장 | ~1,000명  | ~$3       | $0      | ~$1    | **~$4**  |
| 확장 | ~10,000명 | ~$25      | $19     | ~$1    | **~$45** |

### 수익 전망 (월간)

**시나리오 A: PWA 웹 구독 (토스페이먼츠, 수수료 4%)**

| 구독자 수 | 월 구독료 | 월 매출     | PG 수수료 | 순매출          |
| --------- | --------- | ----------- | --------- | --------------- |
| 100명     | 1,000원   | 100,000원   | 4,000원   | **96,000원**    |
| 500명     | 1,000원   | 500,000원   | 20,000원  | **480,000원**   |
| 1,000명   | 1,000원   | 1,000,000원 | 40,000원  | **960,000원**   |
| 5,000명   | 1,000원   | 5,000,000원 | 200,000원 | **4,800,000원** |

**시나리오 B: 앱스토어 인앱구독 (수수료 15%)**

| 구독자 수 | 월 구독료 | 월 매출     | 스토어 수수료 | 순매출        |
| --------- | --------- | ----------- | ------------- | ------------- |
| 100명     | 1,000원   | 100,000원   | 15,000원      | **85,000원**  |
| 500명     | 1,000원   | 500,000원   | 75,000원      | **425,000원** |
| 1,000명   | 1,000원   | 1,000,000원 | 150,000원     | **850,000원** |

> 참고: 전국 초등학교 교사 약 19만명. 체육 전담 + 담임 중 체육 수업하는 교사 = 타겟 시장 상당히 큼.
> PWA 웹 결제가 수수료 면에서 4배 유리 (4% vs 15%). 앱스토어는 노출/접근성 확보용으로 병행.

---

## 7. 검증 방법

### Phase 1 완료 검증:

- [ ] `.env.local` 삭제 후 `npm run dev` → Firebase 연결 실패 확인 (환경변수 작동)
- [ ] Firestore 규칙: `name` 필드 없는 클래스 생성 시도 → 거부 확인
- [ ] 학급 20개 로드 시 Chrome DevTools Network 탭에서 Firestore 요청 수 확인
- [ ] 네트워크 끊고 작업 → 에러 토스트 표시 확인
- [ ] 새 로그인 시 개인정보 동의 모달 표시 → 동의/거부 정상 동작

### Phase 2 완료 검증:

- [ ] `npm run test` 통과 + 커버리지 80% 이상
- [ ] `firebase emulators:start` → localhost:4000 에뮬레이터 UI 접속
- [ ] `staging--*.netlify.app` URL 접속 확인
- [ ] `npm run build` 성공 + 번들 400KB 이하

### Phase 3 완료 검증:

- [ ] 토스페이먼츠 테스트 결제 성공 (테스트 카드)
- [ ] 결제 후 Firestore에 구독 상태 저장 확인
- [ ] Pro 기능 잠금/해제 정상 동작
- [ ] 성별 균형 모둠뽑기 → 각 팀 남녀 비율 ±1 이내

---

> 본 문서는 PEPick! 프로젝트의 상업화를 위한 종합 컨설팅 계획서입니다.
> 법적 요건(겸직허가, 개인정보보호)을 최우선으로 확인한 후, Phase 1부터 순차적으로 진행하는 것을 권장합니다.
