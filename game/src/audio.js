// Sound, synthesised with the Web Audio API (no sound files): gunshots, jumps, stomps, groans,
// pickups, molotov blasts, the safe-house chime, the end of a run, and a driving beat that speeds
// up with the run. It starts on the first key or click, as browsers require.
import {
  EVENT_BITE, EVENT_BLAST, EVENT_CAUGHT, EVENT_EMPTY, EVENT_HIT, EVENT_JUMP, EVENT_KILL, EVENT_LAND,
  EVENT_MOLOTOV, EVENT_PICKUP, EVENT_SAFEHOUSE, EVENT_SHOT, EVENT_SLIDE, EVENT_STOMP,
} from './world.js';

/** Make the sound system; every method is safe to call before audio is allowed or when it is unavailable. */
export function createAudio() {
  let context = null;
  let master = null;
  let noise = null;
  let muted = false;
  let nextBeat = 0;
  let beat = 0;

  const unlock = () => {
    if (context) {
      if (context.state === 'suspended') context.resume();
      return;
    }
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    context = new AudioContext();
    master = context.createGain();
    master.gain.value = muted ? 0 : 0.5;
    master.connect(context.destination);
    noise = context.createBuffer(1, context.sampleRate, context.sampleRate);
    const data = noise.getChannelData(0);
    for (let index = 0; index < data.length; index += 1) data[index] = Math.random() * 2 - 1;
  };

  /** A pitched blip: `type` wave from `from` Hz to `to` Hz over `length` seconds. */
  const tone = (type, from, to, length, volume, delay = 0) => {
    if (!context) return;
    const start = context.currentTime + delay;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(from, start);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, to), start + length);
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + length);
    oscillator.connect(gain).connect(master);
    oscillator.start(start);
    oscillator.stop(start + length + 0.02);
  };

  /** A burst of filtered noise: gunshots, impacts, fire. */
  const hiss = (length, volume, frequency, delay = 0, filterType = 'lowpass') => {
    if (!context) return;
    const start = context.currentTime + delay;
    const source = context.createBufferSource();
    source.buffer = noise;
    const filter = context.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.value = frequency;
    const gain = context.createGain();
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + length);
    source.connect(filter).connect(gain).connect(master);
    source.start(start, Math.random() * 0.5);
    source.stop(start + length + 0.02);
  };

  /** A zombie's groan: a low, wobbling sawtooth. */
  const groan = () => {
    if (!context) return;
    const base = 70 + Math.random() * 40;
    tone('sawtooth', base, base * 0.6, 0.45, 0.12);
    tone('square', base * 1.5, base * 0.8, 0.35, 0.04, 0.03);
  };

  const audio = {
    unlock,
    get muted() {
      return muted;
    },
    toggleMute() {
      muted = !muted;
      if (master) master.gain.value = muted ? 0 : 0.5;
      return muted;
    },
    /** Play the sounds for a step's events. */
    play(events) {
      if (!context || muted) return;
      if (events & EVENT_SHOT) {
        hiss(0.12, 0.5, 2400);
        tone('square', 180, 60, 0.08, 0.15);
      }
      if (events & EVENT_EMPTY) tone('square', 900, 700, 0.04, 0.08);
      if (events & EVENT_JUMP) tone('square', 260, 520, 0.12, 0.1);
      if (events & EVENT_SLIDE) hiss(0.25, 0.15, 900, 0, 'bandpass');
      if (events & EVENT_LAND) hiss(0.06, 0.12, 400);
      if (events & EVENT_KILL) {
        groan();
        hiss(0.18, 0.25, 700);
      }
      if (events & EVENT_STOMP) {
        tone('square', 160, 40, 0.18, 0.25);
        hiss(0.12, 0.3, 500);
      }
      if (events & EVENT_HIT) {
        tone('sawtooth', 120, 50, 0.3, 0.3);
        hiss(0.2, 0.35, 300);
      }
      if (events & EVENT_PICKUP) {
        tone('triangle', 880, 1320, 0.1, 0.12);
        tone('triangle', 1320, 1760, 0.1, 0.1, 0.06);
      }
      if (events & EVENT_MOLOTOV) hiss(0.3, 0.12, 1200, 0, 'highpass');
      if (events & EVENT_BLAST) {
        hiss(0.7, 0.5, 600);
        tone('sine', 90, 30, 0.6, 0.35);
      }
      if (events & EVENT_BITE) {
        tone('square', 500, 300, 0.06, 0.1);
        tone('square', 600, 350, 0.06, 0.1, 0.07);
      }
      if (events & EVENT_SAFEHOUSE) [523, 659, 784, 1046].forEach((note, index) => tone('triangle', note, note, 0.3, 0.15, index * 0.1));
      if (events & EVENT_CAUGHT) {
        [392, 330, 262, 196].forEach((note, index) => tone('sawtooth', note, note * 0.97, 0.45, 0.13, index * 0.22));
        for (let index = 0; index < 4; index += 1) setTimeout(groan, index * 140);
      }
    },
    /** Keep the run's beat going: kick, hat and bass, faster as `speed` (0 to 1) rises. Silent when `running` is false. */
    music(running, speed) {
      if (!context || muted || !running) {
        if (context) nextBeat = context.currentTime + 0.1;
        return;
      }
      const interval = 0.3 - speed * 0.1;
      while (nextBeat < context.currentTime + 0.12) {
        const delay = Math.max(0, nextBeat - context.currentTime);
        if (beat % 2 === 0) tone('sine', 120, 40, 0.18, 0.28, delay);
        hiss(0.04, 0.05, 6000, delay, 'highpass');
        const bass = [55, 55, 65, 49][Math.floor(beat / 4) % 4];
        if (beat % 2 === 1) tone('sawtooth', bass, bass, interval * 0.9, 0.06, delay);
        beat += 1;
        nextBeat += interval;
      }
    },
  };
  return audio;
}
