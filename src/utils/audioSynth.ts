// Web Audio API Sound Synthesizer for UI sound effects and ambient focus background music

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

// 1. Play crisp Pop sound effect
export function playPopSound() {
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.08);

    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.08);
  } catch {
    // Audio context play error handled gracefully
  }
}

// 2. Play triumphant Completion Chime (used for "Tandai Sudah Dibaca")
export function playCompletionSound() {
  try {
    const ctx = getAudioContext();
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6 major chord
    const now = ctx.currentTime;

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.07);

      gain.gain.setValueAtTime(0, now + idx * 0.07);
      gain.gain.linearRampToValueAtTime(0.18, now + idx * 0.07 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.07 + 0.6);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + idx * 0.07);
      osc.stop(now + idx * 0.07 + 0.6);
    });
  } catch {
    // Audio context error handled
  }
}

// 3. Focus Background Ambient Audio Synthesizer Engine
class FocusAudioEngine {
  private ctx: AudioContext | null = null;
  private isPlaying = false;
  private gainNode: GainNode | null = null;
  private oscillators: OscillatorNode[] = [];
  private noiseNode: AudioBufferSourceNode | null = null;
  private volume = 0.3;
  private currentMode: 'lofi' | 'ambient' | 'rain' = 'lofi';

  public togglePlay(): boolean {
    if (this.isPlaying) {
      this.stop();
      return false;
    } else {
      this.start();
      return true;
    }
  }

  public setMode(mode: 'lofi' | 'ambient' | 'rain') {
    this.currentMode = mode;
    if (this.isPlaying) {
      this.stop();
      this.start();
    }
  }

  public setVolume(val: number) {
    this.volume = val;
    if (this.gainNode && this.ctx) {
      this.gainNode.gain.setValueAtTime(this.volume * 0.25, this.ctx.currentTime);
    }
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  private start() {
    try {
      this.ctx = getAudioContext();
      this.gainNode = this.ctx.createGain();
      this.gainNode.gain.setValueAtTime(this.volume * 0.25, this.ctx.currentTime);
      this.gainNode.connect(this.ctx.destination);

      const now = this.ctx.currentTime;

      if (this.currentMode === 'lofi') {
        // Warm Lo-Fi Chords (Fmaj7 / Cmaj7 ambient pads)
        const freqs = [174.61, 220.00, 261.63, 329.63]; // F3, A3, C4, E4
        freqs.forEach((f) => {
          if (!this.ctx || !this.gainNode) return;
          const osc = this.ctx.createOscillator();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(f, now);

          // LFO for slow vinyl pitch wobble
          const lfo = this.ctx.createOscillator();
          const lfoGain = this.ctx.createGain();
          lfo.frequency.setValueAtTime(0.2, now);
          lfoGain.gain.setValueAtTime(1.5, now);
          lfo.connect(lfoGain);
          lfoGain.connect(osc.frequency);
          lfo.start();

          osc.connect(this.gainNode);
          osc.start();
          this.oscillators.push(osc, lfo);
        });
      } else if (this.currentMode === 'ambient') {
        // Deep Ambient Meditation Frequency
        const freqs = [110.00, 164.81, 196.00, 246.94]; // A2, E3, G3, B3
        freqs.forEach((f) => {
          if (!this.ctx || !this.gainNode) return;
          const osc = this.ctx.createOscillator();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(f, now);

          osc.connect(this.gainNode);
          osc.start();
          this.oscillators.push(osc);
        });
      } else if (this.currentMode === 'rain') {
        // Soft White Noise / Nature Breeze Simulation
        const bufferSize = this.ctx.sampleRate * 2;
        const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          output[i] = Math.random() * 2 - 1;
        }

        const whiteNoise = this.ctx.createBufferSource();
        whiteNoise.buffer = noiseBuffer;
        whiteNoise.loop = true;

        // Lowpass filter to make it sound like gentle rain
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(800, now);

        whiteNoise.connect(filter);
        filter.connect(this.gainNode);
        whiteNoise.start();
        this.noiseNode = whiteNoise;
      }

      this.isPlaying = true;
    } catch {
      this.isPlaying = false;
    }
  }

  public stop() {
    this.oscillators.forEach((osc) => {
      try {
        osc.stop();
        osc.disconnect();
      } catch {
        // ignore
      }
    });
    this.oscillators = [];

    if (this.noiseNode) {
      try {
        this.noiseNode.stop();
        this.noiseNode.disconnect();
      } catch {
        // ignore
      }
      this.noiseNode = null;
    }

    this.isPlaying = false;
  }
}

export const focusAudioEngine = new FocusAudioEngine();
