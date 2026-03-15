/* ============================================
   PE Picker - Whistle (만능 휘슬 FAB)
   OfflineAudioContext 사전 렌더링 + HTML5 Audio 재생
   iOS Safari 무음 스위치 우회
   ============================================ */

let isPlaying = false;
let currentMode = 'hold';
let pressing = false;
let cacheReady = false;

// 사전 렌더링된 Audio 엘리먼트 캐시
let audioCache = { hold: null, long: null, triple: null };

// === DOM 참조 (패널) ===
let panel = null;
let whistleBtn = null;
let ring1 = null;
let ring2 = null;
let volSlider = null;
let volLabel = null;
let btnLabel = null;
let hintEl = null;

// === DOM 참조 (전체화면 타이머 내 인라인 휘슬) ===
let timerWhistleBtn = null;
let timerRing1 = null;
let timerRing2 = null;
let timerMode = 'hold';

// === Audio 유틸 ===
function makeSoftClipCurve(amount) {
  const samples = 44100;
  const curve = new Float32Array(samples);
  for (let i = 0; i < samples; i++) {
    const x = (i * 2) / samples - 1;
    curve[i] = ((Math.PI + amount) * x) / (Math.PI + amount * Math.abs(x));
  }
  return curve;
}

function getVolume() {
  return volSlider ? parseFloat(volSlider.value) / 100 : 1;
}

function getCubicVol() {
  const v = getVolume();
  return v * v * v;
}

// === OfflineAudioContext 렌더링 ===

// 단일 톤 렌더링 (hold, long용) — loopMode: true면 끝부분 fade out 생략 (루프 끊김 방지)
async function renderWhistleWav(duration, loopMode = false) {
  const sampleRate = 44100;
  const length = Math.ceil(sampleRate * duration);
  const offline = new OfflineAudioContext(1, length, sampleRate);
  const now = 0;
  const end = duration;

  // 체인: preGain → waveshaper → comp1 → comp2 → limiter → postGain → destination
  const preGain = offline.createGain();
  preGain.gain.setValueAtTime(4.0, now);
  const shaper = offline.createWaveShaper();
  shaper.curve = makeSoftClipCurve(18);
  shaper.oversample = '4x';
  const comp1 = offline.createDynamicsCompressor();
  comp1.threshold.setValueAtTime(-28, now);
  comp1.knee.setValueAtTime(3, now);
  comp1.ratio.setValueAtTime(14, now);
  comp1.attack.setValueAtTime(0.001, now);
  comp1.release.setValueAtTime(0.03, now);
  const comp2 = offline.createDynamicsCompressor();
  comp2.threshold.setValueAtTime(-12, now);
  comp2.knee.setValueAtTime(2, now);
  comp2.ratio.setValueAtTime(10, now);
  comp2.attack.setValueAtTime(0.001, now);
  comp2.release.setValueAtTime(0.02, now);
  const limiter = offline.createDynamicsCompressor();
  limiter.threshold.setValueAtTime(-1, now);
  limiter.knee.setValueAtTime(0, now);
  limiter.ratio.setValueAtTime(20, now);
  limiter.attack.setValueAtTime(0.0005, now);
  limiter.release.setValueAtTime(0.005, now);
  const postGain = offline.createGain();
  postGain.gain.setValueAtTime(2.0, now);
  preGain.connect(shaper);
  shaper.connect(comp1);
  comp1.connect(comp2);
  comp2.connect(limiter);
  limiter.connect(postGain);
  postGain.connect(offline.destination);

  // 엔벨로프 — loopMode면 fade out 생략 (끊김 없는 루프)
  const env = offline.createGain();
  env.gain.setValueAtTime(0, now);
  env.gain.linearRampToValueAtTime(1, now + 0.015);
  if (!loopMode) {
    env.gain.setValueAtTime(1, end - 0.04);
    env.gain.linearRampToValueAtTime(0, end);
  }
  env.connect(preGain);

  // Oscillator 1 (2800Hz)
  const osc1 = offline.createOscillator();
  osc1.type = 'sine';
  osc1.frequency.setValueAtTime(2800, now);
  osc1.connect(env);

  // Oscillator 2 (5600Hz, 배음)
  const osc2 = offline.createOscillator();
  osc2.type = 'sine';
  osc2.frequency.setValueAtTime(5600, now);
  const g2 = offline.createGain();
  g2.gain.setValueAtTime(0.2, now);
  osc2.connect(g2);
  g2.connect(env);

  // LFO (28Hz 비브라토)
  const lfo = offline.createOscillator();
  lfo.type = 'sine';
  lfo.frequency.setValueAtTime(28, now);
  const lfoG = offline.createGain();
  lfoG.gain.setValueAtTime(80, now);
  lfo.connect(lfoG);
  lfoG.connect(osc1.frequency);
  lfoG.connect(osc2.frequency);

  // 노이즈 (HPF 2000Hz)
  const noiseLen = Math.ceil(sampleRate * duration);
  const noiseBuf = offline.createBuffer(1, noiseLen, sampleRate);
  const nd = noiseBuf.getChannelData(0);
  for (let i = 0; i < noiseLen; i++) nd[i] = (Math.random() * 2 - 1) * 0.12;
  const noise = offline.createBufferSource();
  noise.buffer = noiseBuf;
  const hpf = offline.createBiquadFilter();
  hpf.type = 'highpass';
  hpf.frequency.setValueAtTime(2000, now);
  const nG = offline.createGain();
  nG.gain.setValueAtTime(0.4, now);
  if (!loopMode) {
    nG.gain.setValueAtTime(0.4, end - 0.04);
    nG.gain.linearRampToValueAtTime(0, end);
  }
  noise.connect(hpf);
  hpf.connect(nG);
  nG.connect(preGain);

  osc1.start(now);
  osc1.stop(end + 0.01);
  osc2.start(now);
  osc2.stop(end + 0.01);
  lfo.start(now);
  lfo.stop(end + 0.01);
  noise.start(now);
  noise.stop(end + 0.01);

  return offline.startRendering();
}

// 삐삐삐 패턴 렌더링 (0.25s + 0.1s쉼 + 0.25s + 0.1s쉼 + 0.5s)
async function renderTripleWav() {
  const sampleRate = 44100;
  const totalDuration = 1.2;
  const length = Math.ceil(sampleRate * totalDuration);
  const offline = new OfflineAudioContext(1, length, sampleRate);

  // 3개의 톤 구간 정의
  const tones = [
    { start: 0, duration: 0.25 },
    { start: 0.35, duration: 0.25 },
    { start: 0.7, duration: 0.5 },
  ];

  for (const tone of tones) {
    const now = tone.start;
    const end = now + tone.duration;

    const preGain = offline.createGain();
    preGain.gain.setValueAtTime(4.0, now);
    const shaper = offline.createWaveShaper();
    shaper.curve = makeSoftClipCurve(18);
    shaper.oversample = '4x';
    const comp1 = offline.createDynamicsCompressor();
    comp1.threshold.setValueAtTime(-28, now);
    comp1.knee.setValueAtTime(3, now);
    comp1.ratio.setValueAtTime(14, now);
    comp1.attack.setValueAtTime(0.001, now);
    comp1.release.setValueAtTime(0.03, now);
    const comp2 = offline.createDynamicsCompressor();
    comp2.threshold.setValueAtTime(-12, now);
    comp2.knee.setValueAtTime(2, now);
    comp2.ratio.setValueAtTime(10, now);
    comp2.attack.setValueAtTime(0.001, now);
    comp2.release.setValueAtTime(0.02, now);
    const limiter = offline.createDynamicsCompressor();
    limiter.threshold.setValueAtTime(-1, now);
    limiter.knee.setValueAtTime(0, now);
    limiter.ratio.setValueAtTime(20, now);
    limiter.attack.setValueAtTime(0.0005, now);
    limiter.release.setValueAtTime(0.005, now);
    const postGain = offline.createGain();
    postGain.gain.setValueAtTime(2.0, now);
    preGain.connect(shaper);
    shaper.connect(comp1);
    comp1.connect(comp2);
    comp2.connect(limiter);
    limiter.connect(postGain);
    postGain.connect(offline.destination);

    const env = offline.createGain();
    env.gain.setValueAtTime(0, now);
    env.gain.linearRampToValueAtTime(1, now + 0.015);
    env.gain.setValueAtTime(1, end - 0.04);
    env.gain.linearRampToValueAtTime(0, end);
    env.connect(preGain);

    const osc1 = offline.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(2800, now);
    osc1.connect(env);
    const osc2 = offline.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(5600, now);
    const g2 = offline.createGain();
    g2.gain.setValueAtTime(0.2, now);
    osc2.connect(g2);
    g2.connect(env);
    const lfo = offline.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(28, now);
    const lfoG = offline.createGain();
    lfoG.gain.setValueAtTime(80, now);
    lfo.connect(lfoG);
    lfoG.connect(osc1.frequency);
    lfoG.connect(osc2.frequency);

    const noiseLen = Math.ceil(sampleRate * tone.duration);
    const noiseBuf = offline.createBuffer(1, noiseLen, sampleRate);
    const nd = noiseBuf.getChannelData(0);
    for (let i = 0; i < noiseLen; i++) nd[i] = (Math.random() * 2 - 1) * 0.12;
    const noise = offline.createBufferSource();
    noise.buffer = noiseBuf;
    const hpf = offline.createBiquadFilter();
    hpf.type = 'highpass';
    hpf.frequency.setValueAtTime(2000, now);
    const nG = offline.createGain();
    nG.gain.setValueAtTime(0.4, now);
    nG.gain.setValueAtTime(0.4, end - 0.04);
    nG.gain.linearRampToValueAtTime(0, end);
    noise.connect(hpf);
    hpf.connect(nG);
    nG.connect(preGain);

    osc1.start(now);
    osc1.stop(end + 0.01);
    osc2.start(now);
    osc2.stop(end + 0.01);
    lfo.start(now);
    lfo.stop(end + 0.01);
    noise.start(now);
    noise.stop(end + 0.01);
  }

  return offline.startRendering();
}

// AudioBuffer → WAV Blob 변환 (PCM 16bit)
function audioBufferToWav(buffer) {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const bitDepth = 16;
  const data = buffer.getChannelData(0);
  const byteRate = sampleRate * numChannels * (bitDepth / 8);
  const blockAlign = numChannels * (bitDepth / 8);
  const dataLength = data.length * (bitDepth / 8);
  const headerLength = 44;
  const arrayBuffer = new ArrayBuffer(headerLength + dataLength);
  const view = new DataView(arrayBuffer);

  // RIFF 헤더
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataLength, true);
  writeString(view, 8, 'WAVE');

  // fmt 청크
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // 청크 크기
  view.setUint16(20, 1, true); // PCM 포맷
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);

  // data 청크
  writeString(view, 36, 'data');
  view.setUint32(40, dataLength, true);

  // PCM 데이터 (float → int16)
  for (let i = 0; i < data.length; i++) {
    const s = Math.max(-1, Math.min(1, data[i]));
    view.setInt16(headerLength + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' });
}

function writeString(view, offset, string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

// === 사전 렌더링 (앱 초기화 시 백그라운드) ===
async function prepareAudioCache() {
  try {
    // hold: 3초 (루프 재생 — fade out 없이 매끄러운 반복)
    const holdBuf = await renderWhistleWav(3.0, true);
    const holdBlob = audioBufferToWav(holdBuf);
    audioCache.hold = new Audio(URL.createObjectURL(holdBlob));
    audioCache.hold.loop = true;

    // long: 1.5초
    const longBuf = await renderWhistleWav(1.5);
    audioCache.long = new Audio(URL.createObjectURL(audioBufferToWav(longBuf)));
    audioCache.long.addEventListener('ended', clearMediaSession);

    // triple: 삐삐삐 패턴
    const tripleBuf = await renderTripleWav();
    audioCache.triple = new Audio(URL.createObjectURL(audioBufferToWav(tripleBuf)));
    audioCache.triple.addEventListener('ended', clearMediaSession);

    cacheReady = true;
    // 로딩 표시 해제
    if (whistleBtn) whistleBtn.classList.remove('whistle-main-btn--loading');
    console.log('휘슬 사전 렌더링 완료');
  } catch (e) {
    console.warn('휘슬 사전 렌더링 실패:', e);
  }
}

// === Media Session 초기화 (잠금화면 재생 카드 제거) ===
function clearMediaSession() {
  if ('mediaSession' in navigator) {
    navigator.mediaSession.metadata = null;
    navigator.mediaSession.playbackState = 'none';
  }
}

// === 재생 로직 (HTML5 Audio) ===
function startHoldWhistle() {
  if (isPlaying) return;
  if (!audioCache.hold) return;
  isPlaying = true;
  audioCache.hold.volume = getCubicVol();
  audioCache.hold.currentTime = 0;
  audioCache.hold.play().catch(() => {});
  if (navigator.vibrate) navigator.vibrate([9999]);
}

function stopHoldWhistle() {
  if (!isPlaying) return;
  if (audioCache.hold) {
    audioCache.hold.pause();
    audioCache.hold.currentTime = 0;
  }
  if (navigator.vibrate) navigator.vibrate(0);
  isPlaying = false;
  clearMediaSession();
}

function playLong() {
  if (!audioCache.long) return;
  audioCache.long.volume = getCubicVol();
  audioCache.long.currentTime = 0;
  audioCache.long.play().catch(() => {});
}

function playTriple() {
  if (!audioCache.triple) return;
  audioCache.triple.volume = getCubicVol();
  audioCache.triple.currentTime = 0;
  audioCache.triple.play().catch(() => {});
}

// === 볼륨 업데이트 ===
function updateVolume() {
  const v = getVolume();
  if (volLabel) volLabel.textContent = Math.round(v * 100) + '%';
  // 재생 중인 hold Audio 볼륨 실시간 업데이트
  if (isPlaying && audioCache.hold) {
    audioCache.hold.volume = getCubicVol();
  }
}

// === 리플 애니메이션 (FAB 패널) ===
function startRipple() {
  if (ring1) ring1.classList.add('whistle-ring--continuous');
  if (ring2) setTimeout(() => ring2.classList.add('whistle-ring--continuous'), 400);
}

function stopRipple() {
  if (ring1) ring1.classList.remove('whistle-ring--continuous');
  if (ring2) ring2.classList.remove('whistle-ring--continuous');
}

function pulseRipple() {
  [ring1, ring2].forEach((r, i) => {
    if (!r) return;
    r.classList.remove('whistle-ring--animate');
    void r.offsetWidth;
    setTimeout(() => r.classList.add('whistle-ring--animate'), i * 120);
  });
}

// === 리플 애니메이션 (타이머 인라인) ===
function startTimerRipple() {
  if (timerRing1) timerRing1.classList.add('timer-whistle-ring--continuous');
  if (timerRing2) setTimeout(() => timerRing2.classList.add('timer-whistle-ring--continuous'), 400);
}

function stopTimerRipple() {
  if (timerRing1) timerRing1.classList.remove('timer-whistle-ring--continuous');
  if (timerRing2) timerRing2.classList.remove('timer-whistle-ring--continuous');
}

function pulseTimerRipple() {
  [timerRing1, timerRing2].forEach((r, i) => {
    if (!r) return;
    r.classList.remove('timer-whistle-ring--animate');
    void r.offsetWidth;
    setTimeout(() => r.classList.add('timer-whistle-ring--animate'), i * 120);
  });
}

// === 이벤트 핸들러 (async 제거 — 제스처 컨텍스트 보존) ===
function handleDown(e) {
  e.preventDefault();
  if (pressing || !cacheReady) return;
  pressing = true;
  if (whistleBtn) whistleBtn.classList.add('whistle-main-btn--pressed');

  if (currentMode === 'hold') {
    startHoldWhistle();
    startRipple();
  } else if (currentMode === 'long') {
    playLong();
    pulseRipple();
    if (navigator.vibrate) navigator.vibrate([80, 30, 80]);
    setTimeout(() => {
      pressing = false;
      if (whistleBtn) whistleBtn.classList.remove('whistle-main-btn--pressed');
    }, 300);
  } else if (currentMode === 'triple') {
    playTriple();
    pulseRipple();
    if (navigator.vibrate) navigator.vibrate([80, 30, 80]);
    setTimeout(() => {
      pressing = false;
      if (whistleBtn) whistleBtn.classList.remove('whistle-main-btn--pressed');
    }, 300);
  }
}

function handleUp(e) {
  if (e) e.preventDefault();
  if (!pressing) return;
  if (currentMode === 'hold') {
    pressing = false;
    if (whistleBtn) whistleBtn.classList.remove('whistle-main-btn--pressed');
    stopHoldWhistle();
    stopRipple();
  }
}

// === 타이머 인라인 휘슬 핸들러 ===
let timerPressing = false;

function handleTimerDown(e) {
  e.preventDefault();
  if (timerPressing || !cacheReady) return;
  timerPressing = true;
  if (timerWhistleBtn) timerWhistleBtn.classList.add('timer-whistle-btn--pressed');

  if (timerMode === 'hold') {
    startHoldWhistle();
    startTimerRipple();
  } else if (timerMode === 'long') {
    playLong();
    pulseTimerRipple();
    if (navigator.vibrate) navigator.vibrate([80, 30, 80]);
    setTimeout(() => {
      timerPressing = false;
      if (timerWhistleBtn) timerWhistleBtn.classList.remove('timer-whistle-btn--pressed');
    }, 300);
  } else if (timerMode === 'triple') {
    playTriple();
    pulseTimerRipple();
    if (navigator.vibrate) navigator.vibrate([80, 30, 80]);
    setTimeout(() => {
      timerPressing = false;
      if (timerWhistleBtn) timerWhistleBtn.classList.remove('timer-whistle-btn--pressed');
    }, 300);
  }
}

function handleTimerUp(e) {
  if (e) e.preventDefault();
  if (!timerPressing) return;
  if (timerMode === 'hold') {
    timerPressing = false;
    if (timerWhistleBtn) timerWhistleBtn.classList.remove('timer-whistle-btn--pressed');
    stopHoldWhistle();
    stopTimerRipple();
  }
}

// === 패널 토글 ===
let panelOpen = false;

function togglePanel() {
  panelOpen = !panelOpen;
  if (panel) panel.classList.toggle('whistle-panel--open', panelOpen);
}

function closePanel() {
  panelOpen = false;
  if (panel) panel.classList.remove('whistle-panel--open');
}

// === 모드 변경 ===
function setMode(mode) {
  currentMode = mode;
  panel.querySelectorAll('.whistle-mode-btn').forEach(b => {
    b.classList.toggle('whistle-mode-btn--active', b.dataset.mode === mode);
  });
  if (btnLabel) {
    const labels = { hold: '꾹 누르기', long: '길게 삐———', triple: '삐삐삐!' };
    btnLabel.textContent = labels[mode] || '꾹 누르기';
  }
  if (hintEl) {
    if (mode === 'hold') {
      hintEl.textContent = '누르고 있는 동안 소리가 납니다';
    } else {
      hintEl.textContent = '버튼을 누르세요';
    }
    if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
      hintEl.textContent = '소리가 안 나면 옆면 무음 스위치를 해제하세요';
    }
  }
}

// === 표시/숨김 (하위 호환) ===
function show() {
  /* tools-fab.js가 관리 */
}

function hide() {
  closePanel();
}

// === 전체화면 타이머 휘슬 바인딩 헬퍼 ===
function bindTimerWhistle(btnId, ring1Id, ring2Id) {
  const btn = document.getElementById(btnId);
  const r1 = document.getElementById(ring1Id);
  const r2 = document.getElementById(ring2Id);
  if (!btn) return;

  if (!timerWhistleBtn) {
    timerWhistleBtn = btn;
    timerRing1 = r1;
    timerRing2 = r2;
  }

  const down = e => {
    e.preventDefault();
    timerWhistleBtn = btn;
    timerRing1 = r1;
    timerRing2 = r2;
    handleTimerDown(e);
  };
  const up = e => {
    handleTimerUp(e);
  };

  btn.addEventListener('touchstart', down, { passive: false });
  btn.addEventListener('touchend', up, { passive: false });
  btn.addEventListener('touchcancel', up, { passive: false });
  btn.addEventListener('mousedown', e => {
    if ('ontouchstart' in window) return;
    down(e);
  });
  document.addEventListener('mouseup', e => {
    if ('ontouchstart' in window) return;
    up(e);
  });
}

// === 초기화 ===
function init() {
  panel = document.getElementById('whistle-panel');
  whistleBtn = document.getElementById('whistle-main-btn');
  ring1 = document.getElementById('whistle-ring1');
  ring2 = document.getElementById('whistle-ring2');
  volSlider = document.getElementById('whistle-vol');
  volLabel = document.getElementById('whistle-vol-label');
  btnLabel = document.getElementById('whistle-btn-label');
  hintEl = document.getElementById('whistle-hint');

  if (!panel || !whistleBtn) return;

  // 휘슬 소리 사전 렌더링 (백그라운드) — 완료 전까지 로딩 표시
  whistleBtn.classList.add('whistle-main-btn--loading');
  prepareAudioCache();

  // 패널 바깥 클릭으로 닫기 (right-toolbar도 제외)
  document.addEventListener('click', e => {
    const toolbar = document.getElementById('right-toolbar');
    if (panelOpen && !panel.contains(e.target) && (!toolbar || !toolbar.contains(e.target))) {
      closePanel();
    }
  });

  // 모드 버튼
  panel.querySelectorAll('.whistle-mode-btn').forEach(b => {
    b.addEventListener('click', () => setMode(b.dataset.mode));
  });

  // 볼륨
  if (volSlider) {
    volSlider.addEventListener('input', updateVolume);
    volSlider.addEventListener('change', updateVolume);
  }

  // 휘슬 버튼 이벤트
  whistleBtn.addEventListener('touchstart', handleDown, { passive: false });
  whistleBtn.addEventListener('touchend', handleUp, { passive: false });
  whistleBtn.addEventListener('touchcancel', handleUp, { passive: false });

  whistleBtn.addEventListener('mousedown', e => {
    if ('ontouchstart' in window) return;
    handleDown(e);
  });
  document.addEventListener('mouseup', e => {
    if ('ontouchstart' in window) return;
    handleUp(e);
  });

  // visibility / blur 시 FAB + 타이머 모두 정지
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      handleUp();
      handleTimerUp();
    }
  });
  window.addEventListener('blur', () => {
    handleUp();
    handleTimerUp();
  });

  // 닫기 버튼
  const closeBtn = document.getElementById('whistle-panel-close');
  if (closeBtn) closeBtn.addEventListener('click', closePanel);

  // === 전체화면 타이머 인라인 휘슬 바인딩 (술래뽑기 + 모둠뽑기) ===
  bindTimerWhistle('tag-timer-whistle-btn', 'tag-timer-whistle-ring1', 'tag-timer-whistle-ring2');
  bindTimerWhistle('gm-timer-whistle-btn', 'gm-timer-whistle-ring1', 'gm-timer-whistle-ring2');

  // 타이머 휘슬 모드 버튼 (술래뽑기 + 모둠뽑기)
  document.querySelectorAll('[data-whistle-mode], [data-gm-whistle-mode]').forEach(b => {
    b.addEventListener('click', () => {
      timerMode = b.dataset.mode;
      const attr = b.hasAttribute('data-gm-whistle-mode')
        ? 'data-gm-whistle-mode'
        : 'data-whistle-mode';
      document.querySelectorAll(`[${attr}]`).forEach(m => {
        m.classList.toggle('timer-whistle-mode--active', m.dataset.mode === timerMode);
      });
    });
  });
}

function destroy() {
  closePanel();
  if (isPlaying) stopHoldWhistle();
  // Object URL 해제
  Object.values(audioCache).forEach(audio => {
    if (audio) {
      audio.pause();
      URL.revokeObjectURL(audio.src);
    }
  });
  audioCache = { hold: null, long: null, triple: null };
  cacheReady = false;
}

function setTimerMode(mode) {
  timerMode = mode;
}

export const Whistle = {
  init,
  destroy,
  show,
  hide,
  togglePanel,
  closePanel,
  bindTimerWhistle,
  setTimerMode,
};
