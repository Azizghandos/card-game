// Tiny WebAudio synth: every sound is an oscillator blip made in code — no audio
// files, no network. The context is created on the first user gesture, so a silent
// page (or a headless screenshot run) never throws.

export function createAudio() {
  let context = null;

  function ensure() {
    if (context) return context;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return null;
      context = new AudioContext();
    } catch {
      context = null;
    }
    return context;
  }

  function blip(frequency, duration, type, gainValue, when = 0) {
    const ctx = ensure();
    if (!ctx) return;
    try {
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = type;
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(gainValue, ctx.currentTime + when);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + when + duration);
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.start(ctx.currentTime + when);
      oscillator.stop(ctx.currentTime + when + duration);
    } catch {
      // Audio is decoration: a failure never breaks the game.
    }
  }

  return {
    unlock() {
      ensure();
    },
    click() {
      blip(660, 0.06, 'sine', 0.08);
    },
    playCard() {
      blip(392, 0.09, 'triangle', 0.12);
      blip(523, 0.12, 'triangle', 0.1, 0.07);
    },
    hit() {
      blip(180, 0.14, 'sawtooth', 0.12);
      blip(120, 0.18, 'square', 0.08, 0.05);
    },
    spell() {
      blip(880, 0.08, 'sine', 0.1);
      blip(1174, 0.14, 'sine', 0.08, 0.06);
    },
    win() {
      [523, 659, 784, 1046].forEach((frequency, i) => blip(frequency, 0.22, 'triangle', 0.12, i * 0.12));
    },
    lose() {
      [392, 330, 262, 196].forEach((frequency, i) => blip(frequency, 0.25, 'sawtooth', 0.07, i * 0.14));
    },
  };
}
