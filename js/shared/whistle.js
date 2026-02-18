/* ============================================
   PE Picker - Whistle (만능 휘슬 FAB)
   Web Audio API 기반 휘슬 모듈
   sound.js와 별도 AudioContext 사용
   ============================================ */

let audioCtx = null;
let isPlaying = false;
let activeNodes = null;
let masterGain = null;
let currentMode = 'hold';
let pressing = false;
let firstUnlocked = false;

// === DOM 참조 (FAB 패널) ===
let fabBtn = null;
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
let timerMode = 'long'; // 타이머에서는 기본 "삐—"

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

function ensureAudio() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === 'suspended') audioCtx.resume();
}

async function unlockAudio() {
  if (firstUnlocked) return;
  ensureAudio();
  // 모바일에서 resume()이 완료될 때까지 대기
  if (audioCtx.state === 'suspended') {
    try {
      await audioCtx.resume();
    } catch (e) {
      /* ignore */
    }
  }
  try {
    const buf = audioCtx.createBuffer(1, 1, 22050);
    const src = audioCtx.createBufferSource();
    src.buffer = buf;
    src.connect(audioCtx.destination);
    src.start(0);
  } catch (e) {
    /* ignore */
  }
  firstUnlocked = true;
}

function getVolume() {
  return volSlider ? parseFloat(volSlider.value) / 100 : 1;
}

function getCubicVol() {
  const v = getVolume();
  return v * v * v;
}

function createMaxChain(now) {
  masterGain = audioCtx.createGain();
  masterGain.gain.setValueAtTime(getCubicVol() * 4.0, now);

  const shaper = audioCtx.createWaveShaper();
  shaper.curve = makeSoftClipCurve(18);
  shaper.oversample = '4x';
  const comp1 = audioCtx.createDynamicsCompressor();
  comp1.threshold.setValueAtTime(-28, now);
  comp1.knee.setValueAtTime(3, now);
  comp1.ratio.setValueAtTime(14, now);
  comp1.attack.setValueAtTime(0.001, now);
  comp1.release.setValueAtTime(0.03, now);
  const comp2 = audioCtx.createDynamicsCompressor();
  comp2.threshold.setValueAtTime(-12, now);
  comp2.knee.setValueAtTime(2, now);
  comp2.ratio.setValueAtTime(10, now);
  comp2.attack.setValueAtTime(0.001, now);
  comp2.release.setValueAtTime(0.02, now);
  const limiter = audioCtx.createDynamicsCompressor();
  limiter.threshold.setValueAtTime(-1, now);
  limiter.knee.setValueAtTime(0, now);
  limiter.ratio.setValueAtTime(20, now);
  limiter.attack.setValueAtTime(0.0005, now);
  limiter.release.setValueAtTime(0.005, now);
  const postGain = audioCtx.createGain();
  postGain.gain.setValueAtTime(2.0, now);

  masterGain.connect(shaper);
  shaper.connect(comp1);
  comp1.connect(comp2);
  comp2.connect(limiter);
  limiter.connect(postGain);
  postGain.connect(audioCtx.destination);
  return masterGain;
}

// === 고정 길이 톤 (long, triple) ===
function createFixedTone(startTime, duration) {
  unlockAudio();
  ensureAudio();

  const now = startTime;
  const end = now + duration;
  const cv = getCubicVol();

  const preGain = audioCtx.createGain();
  preGain.gain.setValueAtTime(cv * 4.0, now);
  const shaper = audioCtx.createWaveShaper();
  shaper.curve = makeSoftClipCurve(18);
  shaper.oversample = '4x';
  const comp1 = audioCtx.createDynamicsCompressor();
  comp1.threshold.setValueAtTime(-28, now);
  comp1.knee.setValueAtTime(3, now);
  comp1.ratio.setValueAtTime(14, now);
  comp1.attack.setValueAtTime(0.001, now);
  comp1.release.setValueAtTime(0.03, now);
  const comp2 = audioCtx.createDynamicsCompressor();
  comp2.threshold.setValueAtTime(-12, now);
  comp2.knee.setValueAtTime(2, now);
  comp2.ratio.setValueAtTime(10, now);
  comp2.attack.setValueAtTime(0.001, now);
  comp2.release.setValueAtTime(0.02, now);
  const limiter = audioCtx.createDynamicsCompressor();
  limiter.threshold.setValueAtTime(-1, now);
  limiter.knee.setValueAtTime(0, now);
  limiter.ratio.setValueAtTime(20, now);
  limiter.attack.setValueAtTime(0.0005, now);
  limiter.release.setValueAtTime(0.005, now);
  const postGain = audioCtx.createGain();
  postGain.gain.setValueAtTime(2.0, now);
  preGain.connect(shaper);
  shaper.connect(comp1);
  comp1.connect(comp2);
  comp2.connect(limiter);
  limiter.connect(postGain);
  postGain.connect(audioCtx.destination);

  const env = audioCtx.createGain();
  env.gain.setValueAtTime(0, now);
  env.gain.linearRampToValueAtTime(1, now + 0.015);
  env.gain.setValueAtTime(1, end - 0.04);
  env.gain.linearRampToValueAtTime(0, end);
  env.connect(preGain);

  const osc1 = audioCtx.createOscillator();
  osc1.type = 'sine';
  osc1.frequency.setValueAtTime(2800, now);
  osc1.connect(env);
  const osc2 = audioCtx.createOscillator();
  osc2.type = 'sine';
  osc2.frequency.setValueAtTime(5600, now);
  const g2 = audioCtx.createGain();
  g2.gain.setValueAtTime(0.2, now);
  osc2.connect(g2);
  g2.connect(env);
  const lfo = audioCtx.createOscillator();
  lfo.type = 'sine';
  lfo.frequency.setValueAtTime(28, now);
  const lfoG = audioCtx.createGain();
  lfoG.gain.setValueAtTime(80, now);
  lfo.connect(lfoG);
  lfoG.connect(osc1.frequency);
  lfoG.connect(osc2.frequency);

  const noiseLen = Math.ceil(audioCtx.sampleRate * duration);
  const noiseBuf = audioCtx.createBuffer(1, noiseLen, audioCtx.sampleRate);
  const nd = noiseBuf.getChannelData(0);
  for (let i = 0; i < noiseLen; i++) nd[i] = (Math.random() * 2 - 1) * 0.12;
  const noise = audioCtx.createBufferSource();
  noise.buffer = noiseBuf;
  const hpf = audioCtx.createBiquadFilter();
  hpf.type = 'highpass';
  hpf.frequency.setValueAtTime(2000, now);
  const nG = audioCtx.createGain();
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

// === 꾹 누르기 (hold) ===
async function startHoldWhistle() {
  if (isPlaying) return;
  ensureAudio();
  if (audioCtx.state !== 'running') {
    await audioCtx.resume();
  }
  doStartHold();
}

function doStartHold() {
  if (isPlaying) return;
  isPlaying = true;
  const now = audioCtx.currentTime;
  const input = createMaxChain(now);

  const env = audioCtx.createGain();
  env.gain.setValueAtTime(0, now);
  env.gain.linearRampToValueAtTime(1, now + 0.015);
  env.connect(input);

  const osc1 = audioCtx.createOscillator();
  osc1.type = 'sine';
  osc1.frequency.setValueAtTime(2800, now);
  osc1.connect(env);
  const osc2 = audioCtx.createOscillator();
  osc2.type = 'sine';
  osc2.frequency.setValueAtTime(5600, now);
  const g2 = audioCtx.createGain();
  g2.gain.setValueAtTime(0.2, now);
  osc2.connect(g2);
  g2.connect(env);
  const lfo = audioCtx.createOscillator();
  lfo.type = 'sine';
  lfo.frequency.setValueAtTime(28, now);
  const lfoG = audioCtx.createGain();
  lfoG.gain.setValueAtTime(80, now);
  lfo.connect(lfoG);
  lfoG.connect(osc1.frequency);
  lfoG.connect(osc2.frequency);

  const noiseLen = audioCtx.sampleRate * 30;
  const noiseBuf = audioCtx.createBuffer(1, noiseLen, audioCtx.sampleRate);
  const nd = noiseBuf.getChannelData(0);
  for (let i = 0; i < noiseLen; i++) nd[i] = (Math.random() * 2 - 1) * 0.12;
  const noise = audioCtx.createBufferSource();
  noise.buffer = noiseBuf;
  const hpf = audioCtx.createBiquadFilter();
  hpf.type = 'highpass';
  hpf.frequency.setValueAtTime(2000, now);
  const nG = audioCtx.createGain();
  nG.gain.setValueAtTime(0.4, now);
  noise.connect(hpf);
  hpf.connect(nG);
  nG.connect(input);

  osc1.start(now);
  osc2.start(now);
  lfo.start(now);
  noise.start(now);
  if (navigator.vibrate) navigator.vibrate([9999]);
  activeNodes = { osc1, osc2, lfo, noise, env, nG };
}

function stopHoldWhistle() {
  if (!isPlaying || !activeNodes) {
    isPlaying = false;
    return;
  }
  const now = audioCtx.currentTime;
  const fade = 0.03;
  try {
    activeNodes.env.gain.cancelScheduledValues(now);
    activeNodes.env.gain.setValueAtTime(activeNodes.env.gain.value, now);
    activeNodes.env.gain.linearRampToValueAtTime(0, now + fade);
    activeNodes.nG.gain.cancelScheduledValues(now);
    activeNodes.nG.gain.setValueAtTime(activeNodes.nG.gain.value, now);
    activeNodes.nG.gain.linearRampToValueAtTime(0, now + fade);
    const st = now + fade + 0.01;
    activeNodes.osc1.stop(st);
    activeNodes.osc2.stop(st);
    activeNodes.lfo.stop(st);
    activeNodes.noise.stop(st);
  } catch (e) {
    /* ignore */
  }
  if (navigator.vibrate) navigator.vibrate(0);
  activeNodes = null;
  masterGain = null;
  isPlaying = false;
}

// === 볼륨 업데이트 ===
function updateVolume() {
  const v = getVolume();
  if (volLabel) volLabel.textContent = Math.round(v * 100) + '%';
  if (masterGain && audioCtx) {
    const now = audioCtx.currentTime;
    const expVol = v * v * v;
    masterGain.gain.cancelScheduledValues(now);
    masterGain.gain.setValueAtTime(expVol * 4.0, now);
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

// === 이벤트 핸들러 ===
async function handleDown(e) {
  e.preventDefault();
  if (pressing) return;
  pressing = true;
  if (whistleBtn) whistleBtn.classList.add('whistle-main-btn--pressed');

  // 모바일: AudioContext resume을 확실히 대기
  ensureAudio();
  if (audioCtx.state !== 'running') {
    await audioCtx.resume();
  }

  if (currentMode === 'hold') {
    startHoldWhistle();
    startRipple();
  } else if (currentMode === 'long') {
    createFixedTone(audioCtx.currentTime, 1.5);
    pulseRipple();
    if (navigator.vibrate) navigator.vibrate([80, 30, 80]);
    setTimeout(() => {
      pressing = false;
      if (whistleBtn) whistleBtn.classList.remove('whistle-main-btn--pressed');
    }, 300);
  } else if (currentMode === 'triple') {
    const now = audioCtx.currentTime;
    createFixedTone(now, 0.25);
    createFixedTone(now + 0.35, 0.25);
    createFixedTone(now + 0.7, 0.5);
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

async function handleTimerDown(e) {
  e.preventDefault();
  if (timerPressing) return;
  timerPressing = true;
  if (timerWhistleBtn) timerWhistleBtn.classList.add('timer-whistle-btn--pressed');

  // 모바일: AudioContext resume을 확실히 대기
  ensureAudio();
  if (audioCtx.state !== 'running') {
    await audioCtx.resume();
  }

  if (timerMode === 'hold') {
    startHoldWhistle();
    startTimerRipple();
  } else if (timerMode === 'long') {
    createFixedTone(audioCtx.currentTime, 1.5);
    pulseTimerRipple();
    if (navigator.vibrate) navigator.vibrate([80, 30, 80]);
    setTimeout(() => {
      timerPressing = false;
      if (timerWhistleBtn) timerWhistleBtn.classList.remove('timer-whistle-btn--pressed');
    }, 300);
  } else if (timerMode === 'triple') {
    const now = audioCtx.currentTime;
    createFixedTone(now, 0.25);
    createFixedTone(now + 0.35, 0.25);
    createFixedTone(now + 0.7, 0.5);
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
  if (fabBtn) fabBtn.classList.toggle('whistle-fab--active', panelOpen);
}

function closePanel() {
  panelOpen = false;
  if (panel) panel.classList.remove('whistle-panel--open');
  if (fabBtn) fabBtn.classList.remove('whistle-fab--active');
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

// === 표시/숨김 ===
function show() {
  if (fabBtn) fabBtn.style.display = '';
}

function hide() {
  if (fabBtn) fabBtn.style.display = 'none';
  closePanel();
}

// === 전체화면 타이머 휘슬 바인딩 헬퍼 ===
function bindTimerWhistle(btnId, ring1Id, ring2Id) {
  const btn = document.getElementById(btnId);
  const r1 = document.getElementById(ring1Id);
  const r2 = document.getElementById(ring2Id);
  if (!btn) return;

  // 첫 번째 바인딩만 timerWhistleBtn 등에 저장 (기존 호환)
  if (!timerWhistleBtn) {
    timerWhistleBtn = btn;
    timerRing1 = r1;
    timerRing2 = r2;
  }

  const down = e => {
    e.preventDefault();
    // 현재 활성 버튼/링 교체
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
  fabBtn = document.getElementById('whistle-fab');
  panel = document.getElementById('whistle-panel');
  whistleBtn = document.getElementById('whistle-main-btn');
  ring1 = document.getElementById('whistle-ring1');
  ring2 = document.getElementById('whistle-ring2');
  volSlider = document.getElementById('whistle-vol');
  volLabel = document.getElementById('whistle-vol-label');
  btnLabel = document.getElementById('whistle-btn-label');
  hintEl = document.getElementById('whistle-hint');

  if (!fabBtn || !panel || !whistleBtn) return;

  // FAB 클릭 — 패널 토글 + AudioContext 미리 활성화 (모바일 필수)
  fabBtn.addEventListener('click', () => {
    togglePanel();
    unlockAudio();
  });

  // 패널 바깥 클릭으로 닫기
  document.addEventListener('click', e => {
    if (panelOpen && !panel.contains(e.target) && !fabBtn.contains(e.target)) {
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
      // 같은 컨테이너 내 모드 버튼만 토글
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
  if (audioCtx) {
    audioCtx.close().catch(() => {});
    audioCtx = null;
  }
  firstUnlocked = false;
}

export const Whistle = {
  init,
  destroy,
  show,
  hide,
};
