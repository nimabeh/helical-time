/**
 * Ethereal Aurora soundscape synthesizer using Web Audio API
 */

let audioCtx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let droneOsc1: OscillatorNode | null = null;
let droneOsc2: OscillatorNode | null = null;
let filter: BiquadFilterNode | null = null;
let isAudioRunning = false;

export function toggleAuroraAudio(enabled: boolean): boolean {
  if (enabled) {
    try {
      if (!audioCtx) {
        const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        audioCtx = new AudioContextClass();
      }

      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }

      if (!masterGain) {
        masterGain = audioCtx.createGain();
        masterGain.gain.setValueAtTime(0.001, audioCtx.currentTime);
        masterGain.gain.exponentialRampToValueAtTime(0.12, audioCtx.currentTime + 3.0);

        filter = audioCtx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(420, audioCtx.currentTime);
        filter.Q.setValueAtTime(3.5, audioCtx.currentTime);

        // Ambient aurora sub-drone 1 (F#2 ~ 92.5 Hz)
        droneOsc1 = audioCtx.createOscillator();
        droneOsc1.type = 'sine';
        droneOsc1.frequency.setValueAtTime(92.5, audioCtx.currentTime);

        // Ambient aurora fifth drone 2 (C#3 ~ 138.6 Hz)
        droneOsc2 = audioCtx.createOscillator();
        droneOsc2.type = 'triangle';
        droneOsc2.frequency.setValueAtTime(138.6, audioCtx.currentTime);

        const lfo = audioCtx.createOscillator();
        lfo.frequency.setValueAtTime(0.12, audioCtx.currentTime);
        const lfoGain = audioCtx.createGain();
        lfoGain.gain.setValueAtTime(120, audioCtx.currentTime);
        lfo.connect(lfoGain);
        lfoGain.connect(filter.frequency);
        lfo.start();

        droneOsc1.connect(filter);
        droneOsc2.connect(filter);
        filter.connect(masterGain);
        masterGain.connect(audioCtx.destination);

        droneOsc1.start();
        droneOsc2.start();
      } else {
        masterGain.gain.cancelScheduledValues(audioCtx.currentTime);
        masterGain.gain.setValueAtTime(masterGain.gain.value, audioCtx.currentTime);
        masterGain.gain.exponentialRampToValueAtTime(0.12, audioCtx.currentTime + 1.5);
      }
      isAudioRunning = true;
      return true;
    } catch {
      return false;
    }
  } else {
    if (audioCtx && masterGain) {
      try {
        masterGain.gain.cancelScheduledValues(audioCtx.currentTime);
        masterGain.gain.setValueAtTime(masterGain.gain.value, audioCtx.currentTime);
        masterGain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.8);
      } catch {
        // Ignore
      }
    }
    isAudioRunning = false;
    return false;
  }
}

/**
 * Play a delicate celestial chime when focused or interacted with
 */
export function playStarlightChime(freq = 880): void {
  if (!audioCtx || !isAudioRunning) return;
  try {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);

    gain.gain.setValueAtTime(0.06, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 1.4);

    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 1.5);
  } catch {
    // Ignore audio errors
  }
}
