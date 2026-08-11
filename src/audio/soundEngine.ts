class SoundEngine {
  private ctx: AudioContext | null = null;
  private soundVolume: number = 0.8;
  private musicVolume: number = 0.5;
  private isMuted: boolean = false;
  private jetpackNode: { osc: OscillatorNode; noise: AudioBufferSourceNode; gain: GainNode } | null = null;
  private isJetpackPlaying: boolean = false;

  constructor() {
    // Lazy init context on first user interaction
  }

  private initCtx() {
    if (!this.ctx) {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        this.ctx = new AudioContextClass();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setVolumes(soundVol: number, musicVol: number) {
    this.soundVolume = Math.max(0, Math.min(1, soundVol));
    this.musicVolume = Math.max(0, Math.min(1, musicVol));
  }

  // --- JETPACK HISS & THRUST ---
  public startJetpack() {
    if (this.isMuted || this.isJetpackPlaying) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const bufferSize = this.ctx.sampleRate * 1;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      noise.loop = true;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 800;
      filter.Q.value = 1.5;

      const gain = this.ctx.createGain();
      gain.gain.value = 0.15 * this.soundVolume;

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      noise.start();
      this.isJetpackPlaying = true;
      this.jetpackNode = { osc: null as unknown as OscillatorNode, noise, gain };
    } catch {
      // Ignore audio start failures
    }
  }

  public stopJetpack() {
    if (this.jetpackNode && this.isJetpackPlaying) {
      try {
        this.jetpackNode.gain.gain.linearRampToValueAtTime(0.001, (this.ctx?.currentTime || 0) + 0.1);
        setTimeout(() => {
          this.jetpackNode?.noise.stop();
          this.jetpackNode = null;
          this.isJetpackPlaying = false;
        }, 100);
      } catch {
        this.isJetpackPlaying = false;
        this.jetpackNode = null;
      }
    }
  }

  // --- WEAPON SOUNDS ---
  public playWeaponShoot(weaponType: string) {
    if (this.isMuted || this.soundVolume <= 0) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;

    switch (weaponType) {
      case 'smg':
      case 'uzi':
      case 'pistol': {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(320, t);
        osc.frequency.exponentialRampToValueAtTime(60, t + 0.08);
        gain.gain.setValueAtTime(0.3 * this.soundVolume, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.08);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + 0.08);
        this.playNoiseBlast(0.05, 1500, 0.2);
        break;
      }
      case 'deagle': {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(220, t);
        osc.frequency.exponentialRampToValueAtTime(30, t + 0.18);
        gain.gain.setValueAtTime(0.45 * this.soundVolume, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.18);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + 0.18);
        this.playNoiseBlast(0.12, 600, 0.3);
        break;
      }
      case 'ar':
      case 'ak47':
      case 'm4':
      case 'saw': {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(280, t);
        osc.frequency.exponentialRampToValueAtTime(50, t + 0.1);
        gain.gain.setValueAtTime(0.35 * this.soundVolume, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + 0.1);
        this.playNoiseBlast(0.08, 1200, 0.25);
        break;
      }
      case 'shotgun': {
        this.playNoiseBlast(0.2, 400, 0.6);
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(180, t);
        osc.frequency.exponentialRampToValueAtTime(30, t + 0.2);
        gain.gain.setValueAtTime(0.5 * this.soundVolume, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.2);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + 0.2);
        break;
      }
      case 'sniper': {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, t);
        osc.frequency.exponentialRampToValueAtTime(100, t + 0.25);
        gain.gain.setValueAtTime(0.6 * this.soundVolume, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.25);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + 0.25);
        this.playNoiseBlast(0.15, 2000, 0.4);
        break;
      }
      case 'rocket': {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, t);
        osc.frequency.linearRampToValueAtTime(350, t + 0.15);
        gain.gain.setValueAtTime(0.5 * this.soundVolume, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.2);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + 0.2);
        break;
      }
      case 'flamethrower': {
        this.playNoiseBlast(0.1, 500, 0.2);
        break;
      }
      case 'laser': {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1200, t);
        osc.frequency.exponentialRampToValueAtTime(200, t + 0.12);
        gain.gain.setValueAtTime(0.35 * this.soundVolume, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.12);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + 0.12);
        break;
      }
      case 'knife':
      case 'punch': {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(400, t);
        osc.frequency.exponentialRampToValueAtTime(100, t + 0.06);
        gain.gain.setValueAtTime(0.3 * this.soundVolume, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.06);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + 0.06);
        break;
      }
    }
  }

  // Helper noise blast for gun feedback
  private playNoiseBlast(duration: number, cutoff: number, volFactor: number) {
    if (!this.ctx) return;
    try {
      const bufferSize = this.ctx.sampleRate * duration;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = cutoff;

      const gain = this.ctx.createGain();
      const t = this.ctx.currentTime;
      gain.gain.setValueAtTime(volFactor * this.soundVolume, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + duration);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      noise.start(t);
    } catch {
      // Audio buffer fallback
    }
  }

  // --- EXPLOSION ---
  public playExplosion() {
    if (this.isMuted || this.soundVolume <= 0) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;

    // Sub bass thump
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(130, t);
    osc.frequency.exponentialRampToValueAtTime(20, t + 0.4);
    gain.gain.setValueAtTime(0.7 * this.soundVolume, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.4);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.4);

    // Noise rumble
    this.playNoiseBlast(0.45, 350, 0.7);
  }

  // --- PICKUP & RELOAD & HIT ---
  public playPickup() {
    if (this.isMuted || this.soundVolume <= 0) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(523.25, t); // C5
    osc.frequency.setValueAtTime(659.25, t + 0.08); // E5
    osc.frequency.setValueAtTime(783.99, t + 0.16); // G5
    gain.gain.setValueAtTime(0.25 * this.soundVolume, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.25);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.25);
  }

  public playReload() {
    if (this.isMuted || this.soundVolume <= 0) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, t);
    osc.frequency.exponentialRampToValueAtTime(900, t + 0.08);
    gain.gain.setValueAtTime(0.2 * this.soundVolume, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.1);
  }

  public playHitMarker(isHeadshot = false) {
    if (this.isMuted || this.soundVolume <= 0) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    if (isHeadshot) {
      // Metallic High Bell Ding for Headshots
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(2400, t);
      osc1.frequency.exponentialRampToValueAtTime(1800, t + 0.12);

      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(3200, t);

      gain.gain.setValueAtTime(0.4 * this.soundVolume, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.ctx.destination);

      osc1.start(t);
      osc2.start(t);
      osc1.stop(t + 0.12);
      osc2.stop(t + 0.12);
    } else {
      // Crisp 1200Hz Hitmarker Click
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(1200, t);
      osc.frequency.exponentialRampToValueAtTime(600, t + 0.04);

      gain.gain.setValueAtTime(0.25 * this.soundVolume, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.04);
    }
  }

  public playKillNotification() {
    if (this.isMuted || this.soundVolume <= 0) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, t);
    osc.frequency.exponentialRampToValueAtTime(450, t + 0.15);

    gain.gain.setValueAtTime(0.35 * this.soundVolume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.15);
  }

  // --- ANNOUNCER & VOICE SYNTH ---
  public playAnnouncer(text: string) {
    if (this.isMuted) return;
    if ('speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.1;
        utterance.pitch = 0.8; // Deep military announcer voice
        utterance.volume = this.soundVolume;
        window.speechSynthesis.speak(utterance);
      } catch {
        // Fallback tone
        this.playPickup();
      }
    }
  }
}

export const soundEngine = new SoundEngine();
