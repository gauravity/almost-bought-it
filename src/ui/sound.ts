import type { GameEvent, GameStatus } from '../engine/types';

type SoundEventType =
  | GameEvent['type']
  | 'milo_woof'
  | 'hotukdeals_drop'
  | 'hin_alert'
  | 'travel_alert'
  | 'footstep'
  | 'phone_ping';

interface BarPattern {
  bass: [number, number, number, number];
  arp: [number, number, number, number];
  melody: Array<number | null>;
}

function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

// 16-bar Zelda / Stardew Valley-inspired chiptune progression in C Major
// Section A (bars 1-8): C - G - Am - F - Dm - G - C - G
// Section B (bars 9-16): C - G - Am - F - Dm - G7 - C - C/G
const BGM_BARS: readonly BarPattern[] = [
  // Bar 1: C
  { bass: [48, 55, 60, 55], arp: [60, 64, 67, 72], melody: [76, null, 79, null, 76, 74, 72, null] },
  // Bar 2: G
  { bass: [43, 50, 55, 50], arp: [59, 62, 67, 71], melody: [74, null, 71, null, 67, null, 71, 74] },
  // Bar 3: Am
  { bass: [45, 52, 57, 52], arp: [60, 64, 69, 72], melody: [76, null, 72, null, 69, 72, 76, null] },
  // Bar 4: F
  { bass: [41, 48, 53, 48], arp: [57, 60, 65, 69], melody: [77, null, 76, 74, 72, null, 69, null] },
  // Bar 5: Dm
  { bass: [50, 57, 62, 57], arp: [62, 65, 69, 74], melody: [74, null, 77, null, 76, 74, 72, null] },
  // Bar 6: G
  { bass: [43, 50, 55, 50], arp: [59, 62, 67, 74], melody: [71, null, 74, null, 79, null, 74, null] },
  // Bar 7: C
  { bass: [48, 55, 60, 55], arp: [60, 64, 67, 72], melody: [76, null, 72, 74, 76, null, 79, null] },
  // Bar 8: G (turnaround)
  { bass: [43, 50, 55, 50], arp: [59, 62, 67, 71], melody: [74, null, null, 71, 72, 74, null, null] },

  // Bar 9: C (brighter motif)
  { bass: [48, 55, 60, 55], arp: [64, 67, 72, 76], melody: [79, null, 76, 79, 84, null, 79, null] },
  // Bar 10: G
  { bass: [43, 50, 55, 50], arp: [62, 67, 71, 74], melody: [79, 77, 74, null, 71, null, 74, null] },
  // Bar 11: Am
  { bass: [45, 52, 57, 52], arp: [60, 64, 69, 76], melody: [76, null, 74, 72, 69, null, 72, 76] },
  // Bar 12: F
  { bass: [41, 48, 53, 48], arp: [60, 65, 69, 72], melody: [77, null, 81, null, 77, 76, 74, null] },
  // Bar 13: Dm
  { bass: [50, 57, 62, 57], arp: [62, 65, 69, 74], melody: [74, 76, 77, null, 81, null, 77, 74] },
  // Bar 14: G7
  { bass: [43, 50, 53, 55], arp: [59, 62, 65, 67], melody: [79, null, 77, null, 74, null, 71, null] },
  // Bar 15: C
  { bass: [48, 55, 60, 55], arp: [60, 64, 67, 72], melody: [72, null, 76, null, 79, null, 76, null] },
  // Bar 16: C -> G resolve
  { bass: [48, 55, 50, 55], arp: [60, 64, 67, 71], melody: [72, null, null, null, 74, null, null, null] },
];

const ARP_STEP_INDEX = [0, 1, 2, 1, 3, 2, 1, 2] as const;
const MUSIC_BASE_GAIN = 0.42;
const MUSIC_DUCK_FACTOR = 0.25;
const SEQUENCER_INTERVAL_MS = 45;
const LOOKAHEAD_SECONDS = 0.12;

class SoundManager {
  private ctx: AudioContext | null = null;
  private muted = false;

  private noiseBuffer: AudioBuffer | null = null;
  private musicGain: GainNode | null = null;
  private musicFilter: BiquadFilterNode | null = null;

  private musicTimerId: number | null = null;
  private musicActive = false;
  private musicDesired = false;
  private musicStatus: GameStatus = 'intro';
  private musicTimeRemaining = 90;
  private musicDucked = false;
  private nextNoteTime = 0;
  private currentStep = 0; // 0..255 (16 bars * 16 sixteenth-note steps)

  public isMuted(): boolean {
    return this.muted;
  }

  public toggleMute(): boolean {
    this.muted = !this.muted;
    if (this.muted) {
      this.stopSequencerOnly();
      if (this.ctx && this.musicGain) {
        const now = this.ctx.currentTime;
        this.musicGain.gain.cancelScheduledValues(now);
        this.musicGain.gain.setTargetAtTime(0.0001, now, 0.02);
      }
    } else if (
      this.musicDesired &&
      (this.musicStatus === 'playing' || this.musicStatus === 'keynote' || this.musicStatus === 'checkout_trap')
    ) {
      this.startMusic();
    }
    return this.muted;
  }

  private ensureContext(): AudioContext | null {
    if (this.muted || typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  private ensureMusicBus(ctx: AudioContext): { filter: BiquadFilterNode; gain: GainNode } {
    if (!this.musicGain || !this.musicFilter) {
      const gain = ctx.createGain();
      const target = this.musicDucked ? MUSIC_BASE_GAIN * MUSIC_DUCK_FACTOR : MUSIC_BASE_GAIN;
      gain.gain.setValueAtTime(target, ctx.currentTime);
      gain.connect(ctx.destination);

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1800, ctx.currentTime);
      filter.Q.setValueAtTime(0.7, ctx.currentTime);
      filter.connect(gain);

      this.musicGain = gain;
      this.musicFilter = filter;
    }
    return { filter: this.musicFilter, gain: this.musicGain };
  }

  private ensureNoiseBuffer(ctx: AudioContext): AudioBuffer {
    if (!this.noiseBuffer) {
      const length = Math.floor(ctx.sampleRate * 0.5);
      const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < length; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      this.noiseBuffer = buffer;
    }
    return this.noiseBuffer;
  }

  public startMusic(): void {
    this.musicDesired = true;
    if (this.muted || typeof window === 'undefined') return;

    const ctx = this.ensureContext();
    if (!ctx) return;

    this.stopSequencerOnly();
    const { gain } = this.ensureMusicBus(ctx);
    const target = this.musicDucked ? MUSIC_BASE_GAIN * MUSIC_DUCK_FACTOR : MUSIC_BASE_GAIN;
    gain.gain.cancelScheduledValues(ctx.currentTime);
    gain.gain.setTargetAtTime(target, ctx.currentTime, 0.04);

    this.musicActive = true;
    this.nextNoteTime = ctx.currentTime + 0.04;
    this.currentStep = 0;

    this.musicTimerId = window.setInterval(() => {
      this.scheduleMusicAhead();
    }, SEQUENCER_INTERVAL_MS);
  }

  public stopMusic(): void {
    this.musicDesired = false;
    this.musicDucked = false;
    this.stopSequencerOnly();
    if (this.ctx && this.musicGain) {
      const now = this.ctx.currentTime;
      this.musicGain.gain.cancelScheduledValues(now);
      this.musicGain.gain.setTargetAtTime(0.0001, now, 0.04);
    }
  }

  private stopSequencerOnly(): void {
    this.musicActive = false;
    if (this.musicTimerId !== null && typeof window !== 'undefined') {
      window.clearInterval(this.musicTimerId);
      this.musicTimerId = null;
    }
  }

  public setMusicState(status: GameStatus, timeRemaining: number): void {
    this.musicStatus = status;
    this.musicTimeRemaining = timeRemaining;

    if (status === 'gameover' || status === 'intro') {
      if (this.musicActive || this.musicDesired) {
        this.stopMusic();
      }
      return;
    }

    const shouldDuck = status === 'keynote';
    if (shouldDuck !== this.musicDucked) {
      this.musicDucked = shouldDuck;
      if (this.ctx && this.musicGain && !this.muted) {
        const now = this.ctx.currentTime;
        const target = shouldDuck ? MUSIC_BASE_GAIN * MUSIC_DUCK_FACTOR : MUSIC_BASE_GAIN;
        this.musicGain.gain.cancelScheduledValues(now);
        this.musicGain.gain.setTargetAtTime(target, now, 0.12);
      }
    }
  }

  private getCurrentBpm(): number {
    if (this.musicTimeRemaining < 30) return 144;
    if (this.musicTimeRemaining <= 60) return 126;
    return 112;
  }

  private scheduleMusicAhead(): void {
    if (!this.musicActive || this.muted || !this.ctx) return;
    const ctx = this.ctx;

    // Guard against tab-switch catchup bursts
    if (ctx.currentTime - this.nextNoteTime > 0.3) {
      this.nextNoteTime = ctx.currentTime + 0.04;
    }

    const stepDuration = 60 / this.getCurrentBpm() / 4; // sixteenth note
    while (this.nextNoteTime < ctx.currentTime + LOOKAHEAD_SECONDS) {
      this.scheduleStep(ctx, this.currentStep, this.nextNoteTime, stepDuration);
      this.nextNoteTime += stepDuration;
      this.currentStep = (this.currentStep + 1) % (BGM_BARS.length * 16);
    }
  }

  private scheduleStep(ctx: AudioContext, step: number, time: number, stepDuration: number): void {
    const bar = BGM_BARS[Math.floor(step / 16)];
    const stepInBar = step % 16;
    const { filter, gain: musicGain } = this.ensureMusicBus(ctx);

    // 1. Warm soft triangle-wave bassline (1 ... 2-and 3 . 4 .)
    if (stepInBar === 0 || stepInBar === 6 || stepInBar === 8 || stepInBar === 12) {
      const bassSlot = stepInBar === 0 ? 0 : stepInBar === 6 ? 1 : stepInBar === 8 ? 2 : 3;
      const bassDur = stepInBar === 0 ? stepDuration * 3.2 : stepDuration * 1.9;
      this.scheduleMusicTone(ctx, musicGain, midiToFreq(bar.bass[bassSlot]), bassDur, 'triangle', 0.11, time);
    }

    // 2. Gentle plucked square/triangle lead arpeggio (lowpass-filtered at 1800Hz)
    if (stepInBar % 2 === 0) {
      const eighthIdx = stepInBar / 2;
      const arpNote = bar.arp[ARP_STEP_INDEX[eighthIdx]];
      this.scheduleMusicTone(ctx, filter, midiToFreq(arpNote), stepDuration * 1.35, 'square', 0.032, time);

      const melodyNote = bar.melody[eighthIdx];
      if (melodyNote !== null) {
        this.scheduleMusicTone(ctx, filter, midiToFreq(melodyNote), stepDuration * 2.1, 'triangle', 0.072, time);
      }
    } else if (this.musicTimeRemaining < 30 && (stepInBar === 3 || stepInBar === 11)) {
      // Subtle extra 16th-note sparkle in Trimester 3
      const arpNote = bar.arp[3];
      this.scheduleMusicTone(ctx, filter, midiToFreq(arpNote), stepDuration * 0.9, 'square', 0.02, time);
    }

    // 3. Subtle filtered noise hi-hat (enters Trimester 2 <60s, drives faster Trimester 3 <30s)
    if (this.musicTimeRemaining < 60) {
      const isT2Hat = stepInBar % 4 === 2;
      const isT3Drive =
        this.musicTimeRemaining < 30 && (stepInBar % 2 === 0 || stepInBar === 7 || stepInBar === 15);
      if (isT2Hat || isT3Drive) {
        const hatGain = isT2Hat ? 0.034 : 0.018;
        this.scheduleMusicHat(ctx, musicGain, time, hatGain);
      }
    }
  }

  private scheduleMusicTone(
    ctx: AudioContext,
    dest: AudioNode,
    freq: number,
    duration: number,
    type: OscillatorType,
    gainVal: number,
    time: number,
  ): void {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, time);
    g.gain.setValueAtTime(0.0001, time);
    g.gain.linearRampToValueAtTime(gainVal, time + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    osc.connect(g);
    g.connect(dest);
    osc.start(time);
    osc.stop(time + duration + 0.015);
  }

  private scheduleMusicHat(ctx: AudioContext, dest: AudioNode, time: number, gainVal: number): void {
    const src = ctx.createBufferSource();
    src.buffer = this.ensureNoiseBuffer(ctx);
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(6200, time);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, time);
    g.gain.linearRampToValueAtTime(gainVal, time + 0.003);
    g.gain.exponentialRampToValueAtTime(0.0001, time + 0.032);
    src.connect(filter);
    filter.connect(g);
    g.connect(dest);
    src.start(time);
    src.stop(time + 0.04);
  }

  private tone(
    freq: number,
    duration: number,
    type: OscillatorType = 'sine',
    gain = 0.08,
    delay = 0,
    endFreq?: number,
  ): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (endFreq) {
      osc.frequency.exponentialRampToValueAtTime(endFreq, now + duration);
    }
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(gain, now + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  private noiseBurst(
    duration: number,
    filterFreq: number,
    q: number,
    gain: number,
    delay = 0,
  ): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime + delay;
    const src = ctx.createBufferSource();
    src.buffer = this.ensureNoiseBuffer(ctx);

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(filterFreq, now);
    filter.Q.setValueAtTime(q, now);

    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(gain, now + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    src.connect(filter);
    filter.connect(g);
    g.connect(ctx.destination);
    src.start(now);
    src.stop(now + duration + 0.02);
  }

  public playEvents(events: GameEvent[]): void {
    for (const ev of events) {
      this.play(ev.type);
    }
  }

  public play(type: SoundEventType): void {
    switch (type) {
      case 'milo_woof':
        // Playful small-dog two-part "arf-woof!"
        this.noiseBurst(0.055, 700, 3, 0.042, 0);
        this.tone(540, 0.09, 'triangle', 0.09, 0, 230);
        this.noiseBurst(0.065, 650, 3, 0.038, 0.13);
        this.tone(490, 0.11, 'triangle', 0.085, 0.13, 210);
        break;

      case 'milo_pat':
        // Happy high playful puppy yip + warm major triad chime
        this.tone(580, 0.08, 'triangle', 0.075, 0, 820);
        this.tone(523.25, 0.12, 'sine', 0.045, 0.06);
        this.tone(659.25, 0.12, 'sine', 0.045, 0.1);
        this.tone(783.99, 0.16, 'sine', 0.05, 0.14);
        break;

      case 'footstep':
        // Very quiet, soft wood/gravel tap
        this.noiseBurst(0.025, 320, 1.4, 0.018, 0);
        break;

      case 'hotukdeals_drop':
        // Bright shopkeeper/deal-alert double-bell (880Hz + 1320Hz shimmer)
        this.tone(880, 0.12, 'sine', 0.06, 0);
        this.tone(1760, 0.09, 'sine', 0.02, 0);
        this.tone(1320, 0.18, 'sine', 0.065, 0.075);
        this.tone(2640, 0.14, 'sine', 0.02, 0.075);
        break;

      case 'hin_alert':
        // Gentle domestic two-tone chime
        this.tone(660, 0.11, 'sine', 0.055, 0);
        this.tone(520, 0.16, 'sine', 0.055, 0.1);
        break;

      case 'travel_alert':
        // Airy boarding-chime triad
        this.tone(523.25, 0.16, 'sine', 0.05, 0);
        this.tone(659.25, 0.16, 'sine', 0.05, 0.1);
        this.tone(783.99, 0.24, 'sine', 0.055, 0.2);
        break;

      case 'phone_ping':
        // Glossy iMessage pop
        this.tone(920, 0.065, 'sine', 0.055, 0, 1240);
        this.tone(1840, 0.035, 'sine', 0.015, 0.01);
        break;

      case 'wp_ship':
        // Mechanical keyboard click + crisp cash/coin double-chime
        this.noiseBurst(0.018, 2200, 2.0, 0.03, 0);
        this.noiseBurst(0.016, 2600, 2.0, 0.025, 0.045);
        this.tone(987.77, 0.07, 'triangle', 0.065, 0.07);
        this.tone(1318.51, 0.14, 'triangle', 0.07, 0.13);
        break;

      case 'vibe_code':
        this.noiseBurst(0.016, 2000, 1.8, 0.022, 0);
        this.tone(440, 0.07, 'sine', 0.06, 0.01, 620);
        break;

      case 'wow_raid':
        // Heroic mini brass-synth raid fanfare (D4 -> F#4 -> A4 -> D5)
        this.tone(293.66, 0.09, 'sawtooth', 0.04, 0);
        this.tone(369.99, 0.09, 'sawtooth', 0.04, 0.08);
        this.tone(440.0, 0.09, 'sawtooth', 0.042, 0.16);
        this.tone(587.33, 0.24, 'sawtooth', 0.048, 0.24);
        this.tone(293.66, 0.22, 'triangle', 0.05, 0.24);
        break;

      case 'office_rotate':
        this.noiseBurst(0.07, 420, 1.2, 0.03, 0);
        this.tone(300, 0.12, 'triangle', 0.07, 0, 520);
        break;

      case 'biscuit':
        this.noiseBurst(0.04, 1400, 1.8, 0.032, 0);
        this.tone(180, 0.05, 'square', 0.035, 0, 90);
        this.tone(240, 0.06, 'square', 0.035, 0.05, 110);
        break;

      case 'coupon_stack':
        this.tone(620, 0.065, 'sine', 0.06, 0);
        this.tone(840, 0.08, 'sine', 0.06, 0.045);
        this.tone(1046.5, 0.1, 'sine', 0.045, 0.09);
        break;

      case 'coupon_collapse':
      case 'ai_overage':
      case 'checkout_veto':
        this.tone(280, 0.14, 'sawtooth', 0.065, 0, 120);
        this.tone(190, 0.2, 'sawtooth', 0.065, 0.1, 95);
        break;

      case 'antibes_trap':
        // Brief airy whoosh followed by comedic descending "wah-wah" trombone drop
        this.noiseBurst(0.16, 900, 1.2, 0.042, 0);
        this.tone(311.13, 0.13, 'sawtooth', 0.048, 0.14, 298);
        this.tone(293.66, 0.13, 'sawtooth', 0.048, 0.27, 282);
        this.tone(277.18, 0.13, 'sawtooth', 0.048, 0.4, 266);
        this.tone(261.63, 0.28, 'sawtooth', 0.052, 0.53, 232);
        break;

      case 'ormskirk_trip':
        // Cheerful two-tone car horn "beep-beep!"
        this.tone(415, 0.08, 'triangle', 0.045, 0);
        this.tone(523, 0.08, 'triangle', 0.045, 0);
        this.tone(415, 0.12, 'triangle', 0.048, 0.13);
        this.tone(523, 0.12, 'triangle', 0.048, 0.13);
        break;

      case 'keynote':
        // Sleek Apple-esque shimmer chord
        this.tone(261.6, 0.65, 'sine', 0.07, 0);
        this.tone(329.6, 0.65, 'sine', 0.06, 0.06);
        this.tone(392.0, 0.7, 'sine', 0.06, 0.12);
        this.tone(523.2, 0.75, 'triangle', 0.05, 0.18);
        break;

      case 'ai_alert':
        this.tone(740, 0.08, 'sine', 0.05, 0);
        this.tone(740, 0.08, 'sine', 0.05, 0.12);
        break;

      case 'ai_switch':
        this.tone(380, 0.1, 'triangle', 0.07, 0, 760);
        break;

      case 'buy_parcel':
        this.tone(360, 0.09, 'triangle', 0.06, 0, 260);
        break;

      case 'resist_parcel':
      case 'hin_quest_paid':
        this.tone(480, 0.09, 'sine', 0.06, 0, 660);
        this.tone(784, 0.12, 'sine', 0.045, 0.07);
        break;

      case 'pedestal_dodge':
        this.tone(520, 0.07, 'sine', 0.07, 0, 980);
        break;

      case 'milo_chew':
        this.noiseBurst(0.05, 1100, 1.5, 0.035, 0);
        this.tone(240, 0.16, 'triangle', 0.075, 0.03, 140);
        this.tone(170, 0.24, 'triangle', 0.075, 0.17, 110);
        break;

      case 'gameover':
        this.tone(329.63, 0.15, 'triangle', 0.065, 0);
        this.tone(293.66, 0.15, 'triangle', 0.065, 0.14);
        this.tone(246.94, 0.18, 'triangle', 0.07, 0.28);
        this.tone(196.0, 0.34, 'triangle', 0.075, 0.44, 174.61);
        break;
    }
  }
}

export const sound = new SoundManager();
