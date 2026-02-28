# PEPick! Design DNA

> 다른 프로젝트에 동일한 UI/CSS 스타일을 적용하기 위한 디자인 가이드

---

## 1. 디자인 철학

**"리퀴드 글라스 모피즘 + 파스텔 톤 + 모바일 퍼스트"**

- **Glassmorphism**: 반투명 배경 + `backdrop-filter: blur(20px)` + 흰색 보더
- **파스텔 그래디언트**: 모든 주요 요소에 `135deg` 그래디언트 적용
- **둥글둥글**: 카드 `16px`, 모달 `20px`, 태그/버튼 `9999px (pill)` 라운딩
- **부드러운 그림자**: 브랜드 컬러(블루) 기반 `rgba(124, 158, 245, ...)` 그림자
- **미니멀 서피스**: 크림색 배경 위에 떠 있는 글래스 카드들
- **마이크로 인터랙션**: hover 시 `translateY(-2px)`, 클릭 시 `scale(0.96)`

---

## 2. 컬러 시스템

### 2.1 브랜드 컬러

```css
:root {
  /* === Primary (보라빛 블루) === */
  --color-primary: #7c9ef5;
  --color-primary-dark: #5b7fe0;
  --color-primary-light: #a5bdf8;

  /* === Secondary (코럴 오렌지) === */
  --color-secondary: #f5a67c;
  --color-secondary-dark: #e08a5b;

  /* === Semantic === */
  --color-success: #7ce0a3;
  --color-success-dark: #5bc882;
  --color-warning: #f5e07c;
  --color-warning-dark: #e0c85b;
  --color-danger: #f57c7c;
  --color-danger-dark: #e05b5b;
}
```

### 2.2 배경 & 서피스

```css
:root {
  --bg-cream: #fff9f0; /* 전체 배경 — 따뜻한 크림 */
  --bg-white: #ffffff; /* 카드/입력 필드 배경 */
  --bg-card: rgba(255, 255, 255, 0.85); /* 반투명 카드 */
}
```

### 2.3 텍스트

```css
:root {
  --text-primary: #1a1a2e; /* 짙은 네이비 — 제목, 본문 */
  --text-secondary: #4a4a6a; /* 중간 — 부제, 라벨 */
  --text-tertiary: #8a8aaa; /* 연한 — 힌트, 메타 정보 */
  --text-white: #ffffff;
}
```

### 2.4 그래디언트 (핵심!)

```css
:root {
  /* 버튼, 제목 배경, 아이콘 영역에 사용 */
  --gradient-primary: linear-gradient(135deg, #7c9ef5, #a78bfa); /* 블루→퍼플 */
  --gradient-secondary: linear-gradient(135deg, #f5a67c, #f5c07c); /* 코럴→옐로 */
  --gradient-success: linear-gradient(135deg, #7ce0a3, #7cf5c0); /* 민트→터코이즈 */
  --gradient-danger: linear-gradient(135deg, #f57c7c, #fa7ca0); /* 레드→핑크 */
  --gradient-bg: linear-gradient(180deg, #fff9f0 0%, #f0e6ff 100%); /* 크림→라벤더 */
}
```

### 2.5 팀/모둠 컬러 (8색)

```css
:root {
  --team-1: #3b82f6; /* 블루 */
  --team-2: #10b981; /* 에메랄드 */
  --team-3: #f59e0b; /* 앰버 */
  --team-4: #ef4444; /* 레드 */
  --team-5: #8b5cf6; /* 바이올렛 */
  --team-6: #ec4899; /* 핑크 */
  --team-7: #06b6d4; /* 시안 */
  --team-8: #84cc16; /* 라임 */
}
```

---

## 3. 글래스모피즘 토큰

```css
:root {
  --glass-bg: rgba(255, 255, 255, 0.6); /* 가벼운 글래스 */
  --glass-bg-heavy: rgba(255, 255, 255, 0.8); /* 진한 글래스 (카드 기본) */
  --glass-border: rgba(255, 255, 255, 0.3); /* 빛나는 흰 보더 */
  --glass-shadow: 0 8px 32px rgba(124, 158, 245, 0.12); /* 기본 그림자 */
  --glass-shadow-hover: 0 12px 40px rgba(124, 158, 245, 0.2); /* 호버 그림자 */
  --glass-blur: blur(20px);
}
```

**적용 예시 — Glass Card:**

```css
.glass-card {
  background: var(--glass-bg-heavy);
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-lg); /* 16px */
  box-shadow: var(--glass-shadow);
  transition:
    transform 250ms ease,
    box-shadow 250ms ease;
}

.glass-card:hover {
  box-shadow: var(--glass-shadow-hover);
  transform: translateY(-2px);
}
```

---

## 4. 타이포그래피

### 4.1 폰트 패밀리

```css
:root {
  --font-family: 'Paperlogy', -apple-system, 'Apple SD Gothic Neo', sans-serif;
  --font-display: 'GmarketSans', 'Paperlogy', sans-serif;
}
```

- **본문**: Paperlogy (한글 웹폰트, 둥근 느낌)
- **디스플레이/제목**: GmarketSans (볼드한 제목용)

### 4.2 CDN 로드

```html
<link rel="preconnect" href="https://cdn.jsdelivr.net" />
<link
  rel="stylesheet"
  href="https://cdn.jsdelivr.net/gh/fonts-archive/Paperlogy/subsets/Paperlogy-dynamic-subset.css"
/>
<link
  rel="stylesheet"
  href="https://cdn.jsdelivr.net/gh/fonts-archive/GmarketSans/GmarketSans.css"
/>
```

### 4.3 폰트 사이즈 스케일

```css
:root {
  --font-size-xs: 0.8125rem; /* 13px — 힌트, 메타 */
  --font-size-sm: 0.9375rem; /* 15px — 부제, 버튼 */
  --font-size-base: 1.0625rem; /* 17px — 본문 */
  --font-size-lg: 1.1875rem; /* 19px — 모달 제목 */
  --font-size-xl: 1.375rem; /* 22px — 페이지 제목 */
  --font-size-2xl: 1.625rem; /* 26px — 랜딩 제목 */
  --font-size-3xl: 2rem; /* 32px — 로그인 타이틀 */
}
```

### 4.4 제목 그래디언트 텍스트

```css
.page-title {
  font-family: var(--font-display);
  font-size: var(--font-size-xl);
  font-weight: 700;
  background: var(--gradient-primary);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
```

---

## 5. 스페이싱 & 보더 반경

### 5.1 스페이싱 (4px 베이스)

```css
:root {
  --space-xs: 4px;
  --space-sm: 8px;
  --space-md: 12px;
  --space-lg: 16px;
  --space-xl: 20px;
  --space-2xl: 24px;
  --space-3xl: 32px;
}
```

### 5.2 보더 반경

```css
:root {
  --radius-sm: 8px; /* 입력필드, 작은 카드 */
  --radius-md: 12px; /* 버튼, 중간 카드 */
  --radius-lg: 16px; /* 글래스 카드 */
  --radius-xl: 20px; /* 모달 */
  --radius-2xl: 24px; /* 큰 카드 */
  --radius-full: 9999px; /* 태그, 알약형 버튼, 프로필 */
}
```

---

## 6. 컴포넌트 패턴

### 6.1 버튼 (`.btn`)

```css
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-sm);
  padding: var(--space-md) var(--space-xl); /* 12px 20px */
  border: none;
  border-radius: var(--radius-md); /* 12px */
  font-family: var(--font-family);
  font-size: var(--font-size-sm); /* 15px */
  font-weight: 600;
  cursor: pointer;
  transition: all 150ms ease;
  white-space: nowrap;
  user-select: none;
}

.btn:active {
  transform: scale(0.96);
}
```

| 변형                  | 스타일                                           |
| --------------------- | ------------------------------------------------ |
| `.btn-primary`        | `gradient-primary` + 흰 텍스트 + 파란 box-shadow |
| `.btn-secondary`      | 글래스 배경 + 어두운 텍스트 + 흰 보더            |
| `.btn-success`        | `gradient-success` + 어두운 텍스트               |
| `.btn-danger`         | `gradient-danger` + 흰 텍스트                    |
| `.btn-outline-danger` | 투명 + 빨간 보더 → hover 시 채워짐               |
| `.btn-sm`             | 패딩 `8px 12px`                                  |
| `.btn-lg`             | 패딩 `16px 24px`                                 |
| `.btn-icon`           | `40×40` 원형                                     |

### 6.2 입력 필드 (`.input`)

```css
.input {
  width: 100%;
  padding: var(--space-md) var(--space-lg); /* 12px 16px */
  border: 1px solid rgba(124, 158, 245, 0.2);
  border-radius: var(--radius-md);
  font-family: var(--font-family);
  font-size: var(--font-size-base);
  background: var(--bg-white);
  color: var(--text-primary);
  outline: none;
}

.input:focus {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(124, 158, 245, 0.15); /* 포커스 링 */
}
```

### 6.3 모달

```
.modal-overlay                    ← 오버레이 (fixed, blur 배경)
  └── .modal                      ← 모달 카드
        ├── .modal-header         ← 제목 + 닫기 버튼
        │     ├── .modal-title
        │     └── .modal-close    ← 32px 원형 닫기 아이콘
        ├── .modal-body           ← 스크롤 영역
        └── .modal-footer         ← 버튼 영역 (flex, 균등 분배)
```

```css
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(4px);
  z-index: 200;
  opacity: 0;
  visibility: hidden;
  transition:
    opacity 250ms,
    visibility 250ms;
}

.modal-overlay.show {
  opacity: 1;
  visibility: visible;
}

.modal {
  width: 100%;
  max-width: 420px;
  max-height: 85vh;
  background: var(--bg-white);
  border-radius: var(--radius-xl); /* 20px */
  box-shadow: 0 24px 48px rgba(0, 0, 0, 0.15);
  overflow: hidden;
  transform: scale(0.95);
  transition: transform 250ms;
  display: flex;
  flex-direction: column;
}

.modal-overlay.show .modal {
  transform: scale(1);
}
```

**핵심 규칙:**

- 열기/닫기: `.show` 클래스 토글 (JS: `UI.showModal(id)` / `UI.hideModal(id)`)
- `display: none` **절대 금지** → `visibility: hidden` + `opacity: 0` 사용
- 보더: `1px solid rgba(124, 158, 245, 0.08)` (헤더/푸터 구분선)

### 6.4 토스트

```css
.toast {
  padding: 12px 20px;
  background: var(--text-primary); /* 다크 배경 */
  color: white;
  border-radius: 9999px; /* 알약형 */
  font-size: 15px;
  font-weight: 500;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
  animation:
    toastIn 0.3s ease,
    toastOut 0.3s ease 2.5s forwards;
}

.toast-success {
  background: var(--color-success-dark);
}
.toast-error {
  background: var(--color-danger-dark);
}
```

### 6.5 태그 (`.tag`)

```css
.tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 8px 12px;
  border-radius: 9999px;
  font-size: 15px;
  font-weight: 500;
}

/* 배경은 브랜드 컬러의 15% 알파 */
.tag-primary {
  background: rgba(124, 158, 245, 0.15);
  color: #5b7fe0;
}
.tag-success {
  background: rgba(124, 224, 163, 0.15);
  color: #5bc882;
}
.tag-danger {
  background: rgba(245, 124, 124, 0.15);
  color: #e05b5b;
}
```

### 6.6 카드 리스트 아이템

```css
.list-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 8px;
  background: var(--bg-white);
  border: 1px solid rgba(0, 0, 0, 0.03); /* 거의 투명한 보더 */
}
```

---

## 7. 레이아웃

### 7.1 앱 컨테이너

```css
.app-container {
  max-width: 480px; /* 모바일 퍼스트 싱글 컬럼 */
  margin: 0 auto;
  padding: 16px;
  padding-top: calc(56px + env(safe-area-inset-top) + 16px);
}
```

### 7.2 상단 네비바

```css
.top-navbar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 56px;
  background: var(--bg-white);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  z-index: 100;
}
```

### 7.3 네비바 탭

```css
.navbar-tab {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px 14px;
  border-radius: 20px; /* 알약형 */
  font-weight: 600;
  font-size: 15px;
  background: transparent;
  border: none;
  color: var(--text-tertiary);
  cursor: pointer;
  transition: all 0.2s;
}

.navbar-tab:hover {
  background: rgba(124, 158, 245, 0.1);
  color: var(--color-primary);
}

.navbar-tab.active {
  background: var(--gradient-primary); /* 그래디언트 채움 */
  color: white;
}
```

### 7.4 페이지 헤더

```css
.page-header {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  margin-bottom: 20px;
  padding: 12px 0;
}

.page-title {
  /* 그래디언트 텍스트 (위 4.4 참조) */
}

.page-subtitle {
  font-size: 15px;
  color: var(--text-tertiary);
  margin-top: 2px;
}
```

---

## 8. 애니메이션

### 8.1 핵심 키프레임

```css
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes scaleIn {
  from {
    opacity: 0;
    transform: scale(0.9);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes cardReveal {
  from {
    opacity: 0;
    transform: perspective(600px) rotateY(30deg) translateY(20px);
  }
  to {
    opacity: 1;
    transform: perspective(600px) rotateY(0deg) translateY(0);
  }
}

@keyframes bounceEmoji {
  0%,
  100% {
    transform: scale(1) rotate(0deg);
  }
  25% {
    transform: scale(1.2) rotate(-5deg);
  }
  50% {
    transform: scale(0.9) rotate(5deg);
  }
  75% {
    transform: scale(1.1) rotate(-3deg);
  }
}
```

### 8.2 유틸리티 클래스

```css
.anim-fade-in {
  animation: fadeIn 0.3s ease forwards;
}
.anim-slide-up {
  animation: slideUp 0.4s ease forwards;
}
.anim-scale-in {
  animation: scaleIn 0.3s ease forwards;
}
.anim-card-reveal {
  animation: cardReveal 0.5s ease forwards;
}
.anim-shake {
  animation: shake 0.5s ease;
}
```

### 8.3 Stagger (시차 등장)

```css
.stagger-1 {
  animation-delay: 0.05s;
}
.stagger-2 {
  animation-delay: 0.1s;
}
.stagger-3 {
  animation-delay: 0.15s;
}
/* ...8까지 0.05s 간격 */
```

### 8.4 트랜지션 토큰

```css
:root {
  --transition-fast: 150ms ease;
  --transition-normal: 250ms ease;
  --transition-slow: 350ms ease;
}
```

### 8.5 접근성

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 9. Z-index 레이어

```css
:root {
  --z-dock: 100; /* 네비바, 사이드 툴바 */
  --z-modal-overlay: 200; /* 모달 오버레이 */
  --z-modal: 210; /* 모달 본체 */
  --z-toast: 300; /* 토스트 알림 */
  --z-fullscreen: 400; /* 전체화면 타이머 등 */
}
```

---

## 10. 보더 패턴 요약

PEPick은 보더 색상에 **브랜드 블루(`#7c9ef5`)의 알파값**을 일관되게 사용합니다:

| 용도               | 값                          |
| ------------------ | --------------------------- |
| 카드 보더          | `rgba(124, 158, 245, 0.12)` |
| 입력 필드          | `rgba(124, 158, 245, 0.2)`  |
| 구분선 (헤더/푸터) | `rgba(124, 158, 245, 0.08)` |
| 테이블 보더        | `rgba(124, 158, 245, 0.22)` |
| 글래스 보더        | `rgba(255, 255, 255, 0.3)`  |
| 리스트 아이템      | `rgba(0, 0, 0, 0.03~0.04)`  |

---

## 11. 스크롤바

```css
::-webkit-scrollbar {
  width: 4px;
}
::-webkit-scrollbar-track {
  background: transparent;
}
::-webkit-scrollbar-thumb {
  background: rgba(124, 158, 245, 0.2);
  border-radius: 4px;
}
::-webkit-scrollbar-thumb:hover {
  background: rgba(124, 158, 245, 0.4);
}
```

---

## 12. iOS / PWA 안전 영역

```css
:root {
  --safe-top: env(safe-area-inset-top, 0px);
  --safe-bottom: env(safe-area-inset-bottom, 0px);
  --safe-left: env(safe-area-inset-left, 0px);
  --safe-right: env(safe-area-inset-right, 0px);
}
```

```html
<meta
  name="viewport"
  content="width=device-width, initial-scale=1.0, viewport-fit=cover, user-scalable=no"
/>
<meta name="theme-color" content="#FFF9F0" />
```

---

## 13. 리셋 & 글로벌 베이스

```css
*,
*::before,
*::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html {
  font-size: 16px;
  -webkit-text-size-adjust: 100%;
  -webkit-tap-highlight-color: transparent;
}

body {
  font-family: var(--font-family);
  background: var(--gradient-bg);
  color: var(--text-primary);
  min-height: 100dvh;
  line-height: 1.5;
  overflow-x: hidden;
  -webkit-font-smoothing: antialiased;
}
```

---

## 14. 새 프로젝트에 복사할 최소 파일

```
css/
├── design-system.css    ← :root 토큰 + 리셋 + 컴포넌트 (.btn, .input, .tag, .glass-card)
├── animations.css       ← 키프레임 + 유틸 클래스 + reduced-motion
└── layout.css           ← 모달, 토스트, 네비바 등 (프로젝트에 맞게 수정)
```

**HTML `<head>` 최소 설정:**

```html
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
<meta name="theme-color" content="#FFF9F0" />

<!-- Fonts -->
<link rel="preconnect" href="https://cdn.jsdelivr.net" />
<link
  rel="stylesheet"
  href="https://cdn.jsdelivr.net/gh/fonts-archive/Paperlogy/subsets/Paperlogy-dynamic-subset.css"
/>
<link
  rel="stylesheet"
  href="https://cdn.jsdelivr.net/gh/fonts-archive/GmarketSans/GmarketSans.css"
/>

<!-- Styles -->
<link rel="stylesheet" href="css/design-system.css" />
<link rel="stylesheet" href="css/animations.css" />
```

---

## 15. 한눈에 보는 DNA 요약

| 항목       | PEPick 스타일                                     |
| ---------- | ------------------------------------------------- |
| **배경**   | 크림→라벤더 세로 그래디언트 (`#fff9f0 → #f0e6ff`) |
| **카드**   | 글래스모피즘 (80% 흰색 + blur 20px + 흰 보더)     |
| **버튼**   | 그래디언트 채움 + 12px 라운드 + scale 피드백      |
| **제목**   | GmarketSans + 그래디언트 텍스트 (블루→퍼플)       |
| **본문**   | Paperlogy 17px + 1.5 행간 + 네이비(#1a1a2e)       |
| **보더**   | 브랜드 블루의 알파값으로 통일                     |
| **그림자** | 브랜드 블루 기반 (`rgba(124,158,245,...)`)        |
| **모달**   | 420px 최대폭 + 20px 라운드 + scale 열림 애니      |
| **토스트** | 알약형 + 다크 배경 + 위에서 슬라이드              |
| **애니**   | fadeIn/slideUp/scaleIn + stagger + 접근성 대응    |
| **앱 폭**  | 480px 싱글 컬럼 (모바일 퍼스트)                   |
| **네비바** | 56px fixed + 알약형 탭 + 그래디언트 활성 상태     |
