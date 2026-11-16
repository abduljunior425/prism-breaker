// Tiny synthesized sound effects with the Web Audio API: no audio files, no network, just
// oscillators. The context is created lazily on the first user gesture (browsers forbid audio
// before one), so the screenshot scenes, which never gesture, stay silent. M toggles mute.

export function createAudio() {
  let context = null;
  let muted = false;

  function ensure() {
    if (context !== null) return context;
    try {
      const Ctor = window.AudioContext || window.webkitAudioContext;
      if (!Ctor) return null;
      context = new Ctor();
    } catch {
      return null;
    }
    return context;
  }

  /** One short tone: frequency in Hz, length in seconds, oscillator type, volume 0..1. */
  function tone(freq, dur, type, vol, when = 0) {
    if (muted) return;
    const ctx = ensure();
    if (ctx === null) return;
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    const t0 = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  return {
    unlock() {
      ensure();
    },
    toggleMute() {
      muted = !muted;
      return muted;
    },
    isMuted() {
      return muted;
    },
    paddle() {
      tone(220, 0.07, 'square', 0.12);
    },
    brick() {
      tone(520, 0.06, 'triangle', 0.16);
      tone(780, 0.05, 'triangle', 0.1, 0.03);
    },
    tough() {
      tone(340, 0.05, 'square', 0.12);
    },
    powerup() {
      tone(660, 0.07, 'sine', 0.16);
      tone(880, 0.07, 'sine', 0.16, 0.07);
      tone(1320, 0.1, 'sine', 0.14, 0.14);
    },
    launch() {
      tone(330, 0.09, 'sine', 0.14);
      tone(495, 0.09, 'sine', 0.12, 0.06);
    },
    lost() {
      tone(320, 0.16, 'sawtooth', 0.14);
      tone(180, 0.22, 'sawtooth', 0.12, 0.12);
    },
    clear() {
      tone(523, 0.1, 'sine', 0.16);
      tone(659, 0.1, 'sine', 0.16, 0.09);
      tone(784, 0.14, 'sine', 0.16, 0.18);
      tone(1047, 0.2, 'sine', 0.14, 0.27);
    },
    win() {
      tone(523, 0.12, 'sine', 0.16);
      tone(659, 0.12, 'sine', 0.16, 0.11);
      tone(784, 0.12, 'sine', 0.16, 0.22);
      tone(1047, 0.24, 'sine', 0.16, 0.33);
    },
  };
}
