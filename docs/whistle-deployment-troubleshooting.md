# 휘슬 기능 배포 트러블슈팅 기록

> PEPick! 프로젝트에서 iOS 휘슬 소리가 안 나는 문제를 해결하는 과정에서 만난 이슈들을 정리한 문서입니다.
> 웹 오디오 + PWA + Netlify 배포 환경에서 발생할 수 있는 실전 문제들을 다룹니다.

---

## 1. 최초 문제: iOS에서 휘슬 소리가 안 남

### 증상

- 데스크톱 브라우저: 정상
- Android: 정상
- **iPhone (Safari/Chrome)**: 무음모드 OFF에서도 소리 안 남

### 원인

iOS Safari에서 **Web Audio API의 OscillatorNode(실시간 합성음)**은 무음 스위치를 존중하고, 사용자 제스처 제약도 엄격함.

### 해결

`OfflineAudioContext`로 소리를 **미리 렌더링** → WAV 파일로 변환 → **HTML5 Audio**(`new Audio(blob URL)`)로 재생.

| 항목            | 기존 (Web Audio API)               | 변경 후 (HTML5 Audio)            |
| --------------- | ---------------------------------- | -------------------------------- |
| 소리 생성       | 실시간 Oscillator                  | OfflineAudioContext 사전 렌더링  |
| 재생 방식       | AudioContext 노드 직접 재생        | `new Audio(objectURL).play()`    |
| iOS 무음 스위치 | 무음이면 소리 안 남                | **무음 스위치 무시**             |
| 제스처 제약     | async/await가 제스처 컨텍스트 소비 | 동기 함수로 제스처 컨텍스트 보존 |

### 핵심 코드 흐름

```
앱 초기화 (init)
  ↓
OfflineAudioContext로 3종 소리 렌더링 (hold/long/triple)
  ↓
AudioBuffer → WAV Blob → URL.createObjectURL()
  ↓
new Audio(blobURL) 생성 + 캐시
  ↓
버튼 터치 시 audio.play() (동기 호출)
```

### 배운 점

- iOS에서 Web Audio API 합성음은 제약이 많다
- HTML5 Audio(`<audio>` 또는 `new Audio()`)는 iOS에서 훨씬 안정적
- `async/await`는 iOS에서 사용자 제스처 컨텍스트를 소비할 수 있으므로 오디오 재생 경로에서는 피해야 한다

---

## 2. PWA 캐시 업데이트 안 됨

### 증상

- 개발 서버(Vite): 소리 잘 남
- Netlify 배포 후 PWA 앱: 소리 안 남 (이전 코드가 계속 실행됨)

### 원인

**`sw.js`가 Vite 빌드 결과물(`dist/`)에 포함되지 않았음.**

```
프로젝트 루트/
├── sw.js              ← 여기에만 있었음
├── public/
│   ├── manifest.json
│   └── assets/
├── dist/              ← 빌드 결과 (sw.js 없음!)
```

Vite는 `public/` 폴더의 파일만 `dist/`로 복사한다. `sw.js`가 루트에만 있었기 때문에 **배포 시 sw.js가 업로드되지 않았고**, 브라우저는 이전에 캐시된 옛날 SW를 계속 사용했다.

### 해결

```bash
# sw.js를 public/ 폴더에 복사
cp sw.js public/sw.js
```

이후 빌드하면 `dist/sw.js`가 자동 포함됨.

### 추가 조치: 캐시 버전 범프

```js
// sw.js
const CACHE_NAME = 'pe-picker-v4'; // 기존
const CACHE_NAME = 'pe-picker-v5'; // 변경 → 기존 캐시 전부 삭제
```

### 배운 점

- Vite 프로젝트에서 **빌드에 포함되어야 하는 정적 파일은 반드시 `public/` 폴더에** 넣어야 한다
- SW 파일이 배포에 빠지면, 이전 캐시가 영원히 유지될 수 있다
- SW 변경 시 `CACHE_NAME` 버전을 올려야 브라우저가 업데이트를 감지한다

---

## 3. 배포 환경에서만 소리 안 남 (핵심 원인)

### 증상

- 개발 서버 (`npm run dev -- --host`): iPhone에서 소리 잘 남
- **Netlify 프로덕션**: "휘슬 준비 완료" 메시지는 뜨지만 소리 완전 무음
- 무음 모드와 무관하게 안 남

### 원인: **CSP (Content-Security-Policy) 헤더가 blob: URL을 차단**

`netlify.toml`에 설정된 보안 헤더:

```toml
# 기존 설정
Content-Security-Policy = "default-src 'self'; script-src 'self' ...; ..."
```

이 설정에서 `media-src`가 **명시적으로 선언되지 않으면 `default-src`를 따른다.**

```
default-src 'self'
  → media-src 도 'self'만 허용
  → new Audio(blob:...) 의 blob: URL은 'self'가 아님
  → ❌ 차단됨 (브라우저가 조용히 무시)
```

**개발 서버(Vite)는 CSP 헤더를 보내지 않기 때문에** 같은 코드가 문제없이 동작했다.

### 해결

```toml
# netlify.toml — CSP에 media-src, worker-src 추가
Content-Security-Policy = "... media-src 'self' blob: data:; worker-src 'self' blob:; ..."
```

| 디렉티브     | 값                   | 이유                            |
| ------------ | -------------------- | ------------------------------- |
| `media-src`  | `'self' blob: data:` | `new Audio(blob:URL)` 재생 허용 |
| `worker-src` | `'self' blob:`       | Service Worker 관련 blob 허용   |

### 디버깅 과정

| 단계 | 시도                                             | 결과                               |
| ---- | ------------------------------------------------ | ---------------------------------- |
| 1    | 앱 완전 종료 후 재시작                           | ❌ 안 됨                           |
| 2    | 사용 기록 지우기                                 | ❌ 안 됨                           |
| 3    | sw.js 캐시 버전 범프 (v4→v5)                     | ❌ 안 됨 (sw.js 자체가 배포 안 됨) |
| 4    | sw.js를 public/로 복사 후 재배포                 | ❌ 안 됨                           |
| 5    | webkit 접두사 추가 (`webkitOfflineAudioContext`) | ❌ 안 됨                           |
| 6    | 디버그 토스트 추가 → "준비 완료"는 뜸            | 렌더링은 성공, 재생만 차단         |
| 7    | **CSP에 `media-src blob:` 추가**                 | ✅ **해결!**                       |

### 배운 점

> **"개발 서버에서 되는데 배포에서 안 되면, 보안 헤더(CSP)를 의심하라."**

- CSP는 **브라우저가 에러 없이 조용히 차단**하기 때문에 디버깅이 어렵다
- `default-src 'self'`는 명시하지 않은 모든 리소스 타입에 적용된다
- `blob:` URL을 사용하는 기능 (오디오, 비디오, Web Worker 등)은 CSP에서 별도 허용이 필요하다
- **개발 서버는 보통 CSP 헤더가 없어서** 배포 환경과 동작이 다를 수 있다

---

## 4. 부수 이슈: iOS 잠금화면 미디어 카드

### 증상

HTML5 Audio 사용 후 잠금화면에 "미디어 재생 중" 카드가 표시됨.

### 원인

iOS가 HTML5 Audio 재생을 미디어 세션으로 등록함.

### 해결

```js
function clearMediaSession() {
  if ('mediaSession' in navigator) {
    navigator.mediaSession.metadata = null;
    navigator.mediaSession.playbackState = 'none';
  }
}
// hold 정지 시, long/triple ended 이벤트에서 호출
```

---

## 5. 부수 이슈: hold 모드 3초 루프 끊김

### 증상

hold 모드(꾹 누르기)에서 3초마다 미세한 끊김 발생.

### 원인

렌더링 시 끝부분 fade out(0.04초)이 있어서 루프 경계에서 무음 구간 생김.

### 해결

```js
// loopMode일 때 fade out 생략
async function renderWhistleWav(duration, loopMode = false) {
  // ...
  if (!loopMode) {
    env.gain.setValueAtTime(1, end - 0.04);
    env.gain.linearRampToValueAtTime(0, end);
  }
}

// hold용은 loopMode = true
const holdBuf = await renderWhistleWav(3.0, true);
```

---

## 요약: 이번에 배운 것들

| #   | 교훈                                                | 카테고리    |
| --- | --------------------------------------------------- | ----------- |
| 1   | iOS에서 Web Audio API 합성음 대신 HTML5 Audio 사용  | iOS 호환성  |
| 2   | Vite 프로젝트의 정적 파일은 `public/` 폴더에        | 빌드 설정   |
| 3   | **dev에서 되고 prod에서 안 되면 CSP 의심**          | 보안 헤더   |
| 4   | CSP에 `blob:` URL 허용 필수 (media-src, worker-src) | 보안 헤더   |
| 5   | SW 캐시 버전 관리로 배포 반영 보장                  | PWA 캐시    |
| 6   | 디버그 토스트로 프로덕션 원격 디버깅 가능           | 디버깅 기법 |

---

## 최종 변경 파일 목록

| 파일                               | 변경 내용                                                           |
| ---------------------------------- | ------------------------------------------------------------------- |
| `js/features/tools/whistle.js`     | Web Audio → OfflineAudioContext + HTML5 Audio 전면 재작성           |
| `js/features/tools/quick-timer.js` | `Whistle.unlockAudio()` 호출 제거                                   |
| `css/layout.css`                   | `.whistle-main-btn--loading` 스타일 추가                            |
| `netlify.toml`                     | CSP에 `media-src 'self' blob: data:; worker-src 'self' blob:;` 추가 |
| `public/sw.js`                     | 캐시 버전 v4→v5 + public 폴더로 이동                                |
