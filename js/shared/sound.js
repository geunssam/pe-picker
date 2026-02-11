/* ============================================
   PE Picker - Sound (Web Audio API)
   ============================================ */

const Sound = (() => {
  let audioCtx = null;

  function getContext() {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  }

  function playTone(frequencies, durations, volume = 0.3) {
    try {
      const ctx = getContext();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';

      let time = now;
      frequencies.forEach((freq, i) => {
        osc.frequency.setValueAtTime(freq, time);
        time += durations[i] || durations[0];
      });

      gain.gain.setValueAtTime(volume, now);
      gain.gain.exponentialRampToValueAtTime(0.01, time);

      osc.start(now);
      osc.stop(time);
    } catch (e) {
      console.log('Sound 재생 실패:', e);
    }
  }

  // 경고음 (타이머 10초)
  function playWarning() {
    playTone([800, 600, 800], [0.1, 0.1, 0.1], 0.3);
  }

  // 종료음 (타이머 끝)
  function playEnd() {
    playTone([400, 300, 200], [0.2, 0.2, 0.2], 0.5);
  }

  // 카운트다운 비프음 (짧고 날카로운 단일 톤)
  function playBeep() {
    playTone([880], [0.08], 0.25);
  }

  // 종료 알림음 (5초간 높-낮 교대 반복)
  let endAlarmTimer = null;
  function playEndAlarm() {
    stopEndAlarm();
    let count = 0;
    const maxCount = 10; // 0.5초 × 10 = 5초
    endAlarmTimer = setInterval(() => {
      if (count >= maxCount) { stopEndAlarm(); return; }
      const freq = count % 2 === 0 ? 880 : 660;
      playTone([freq], [0.3], 0.5);
      count++;
    }, 500);
  }

  function stopEndAlarm() {
    if (endAlarmTimer) { clearInterval(endAlarmTimer); endAlarmTimer = null; }
  }

  // 뽑기 효과음
  function playPick() {
    playTone([523, 659, 784], [0.1, 0.1, 0.15], 0.2);
  }

  // 클릭음
  function playClick() {
    playTone([600], [0.05], 0.1);
  }

  // 에러음
  function playError() {
    playTone([300, 200], [0.15, 0.15], 0.2);
  }

  // AudioContext 활성화 (사용자 제스처 필요)
  function activate() {
    getContext();
  }

  return { playWarning, playEnd, playPick, playClick, playError, playBeep, playEndAlarm, stopEndAlarm, activate };
})();

// 첫 터치/클릭 시 AudioContext 활성화
document.addEventListener('click', () => Sound.activate(), { once: true });
document.addEventListener('touchstart', () => Sound.activate(), { once: true });
