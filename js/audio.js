/* ============ Процедурная музыка (WebAudio) ============ */
/* Темы: ambient (пустота), tension (угроза), warm (костёр/близость),
   sad (утрата), dawn (финал). Всё генерируется на лету, файлов нет. */
(function () {
  'use strict';

  const THEMES = {
    ambient: {
      drones: [{ f: 55, type: 'sawtooth', g: 0.05 }, { f: 55.7, type: 'sawtooth', g: 0.05 }, { f: 110, type: 'sine', g: 0.07 }],
      filter: 320, wind: 0.06,
      scale: [220, 246.9, 261.6, 329.6, 392], noteGain: 0.045, noteEvery: [5, 11], noteType: 'sine',
      pulse: 0
    },
    tension: {
      drones: [{ f: 49, type: 'sawtooth', g: 0.06 }, { f: 51.9, type: 'sawtooth', g: 0.06 }, { f: 98, type: 'triangle', g: 0.05 }],
      filter: 260, wind: 0.04,
      scale: [196, 207.7, 233.1, 293.7], noteGain: 0.035, noteEvery: [3, 7], noteType: 'triangle',
      pulse: 1.05
    },
    warm: {
      drones: [{ f: 87.3, type: 'triangle', g: 0.035 }, { f: 130.8, type: 'sine', g: 0.03 }, { f: 174.6, type: 'sine', g: 0.02 }],
      filter: 620, wind: 0.02,
      scale: [261.6, 293.7, 329.6, 392, 440, 523.3], noteGain: 0.06, noteEvery: [2.5, 6], noteType: 'sine',
      pulse: 0
    },
    fire: {
      drones: [{ f: 87.3, type: 'triangle', g: 0.03 }, { f: 130.8, type: 'sine', g: 0.028 }, { f: 174.6, type: 'sine', g: 0.02 }],
      filter: 620, wind: 0, crackle: 0.11,
      scale: [261.6, 293.7, 329.6, 392, 440, 523.3], noteGain: 0.055, noteEvery: [3, 7], noteType: 'sine',
      pulse: 0
    },
    piano: {
      drones: [{ f: 130.8, type: 'sine', g: 0.035 }, { f: 196, type: 'sine', g: 0.025 }],
      filter: 1600, wind: 0.03,
      scale: [261.6, 293.7, 329.6, 392, 440, 523.3, 587.3, 659.3],
      noteGain: 0.11, noteEvery: [0.7, 1.8], noteType: 'triangle', pluck: true,
      pulse: 0
    },
    sad: {
      drones: [{ f: 65.4, type: 'triangle', g: 0.07 }, { f: 98, type: 'sine', g: 0.05 }],
      filter: 420, wind: 0.05,
      scale: [261.6, 311.1, 349.2, 392, 466.2], noteGain: 0.055, noteEvery: [4, 9], noteType: 'sine',
      pulse: 0
    },
    dawn: {
      drones: [{ f: 130.8, type: 'triangle', g: 0.06 }, { f: 196, type: 'sine', g: 0.05 }, { f: 261.6, type: 'sine', g: 0.035 }],
      filter: 900, wind: 0.04,
      scale: [523.3, 587.3, 659.3, 784, 880], noteGain: 0.05, noteEvery: [2, 5], noteType: 'sine',
      pulse: 0
    },
    silence: { drones: [], filter: 300, wind: 0.06, scale: [], noteGain: 0, noteEvery: [9, 9], pulse: 0 }
  };

  class MusicEngine {
    constructor() {
      this.ctx = null;
      this.master = null;
      this.current = null;      // { name, gain, nodes, timers }
      this.muted = false;
      this.currentName = null;
    }

    ensure() {
      if (this.ctx) return;
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.9;
      this.master.connect(this.ctx.destination);
    }

    noiseBuffer() {
      if (this._nb) return this._nb;
      const len = this.ctx.sampleRate * 3;
      const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      // плавные края, чтобы луп не щёлкал
      const fade = 2048;
      for (let i = 0; i < fade; i++) {
        d[i] *= i / fade;
        d[len - 1 - i] *= i / fade;
      }
      this._nb = buf;
      return buf;
    }

    play(name) {
      if (name === this.currentName) return;
      this.currentName = name;
      if (!this.ctx) return; // запустится при первом жесте
      const cfg = THEMES[name] || THEMES.ambient;
      const t = this.ctx.currentTime;

      // затухание старой темы
      if (this.current) {
        const old = this.current;
        old.gain.gain.cancelScheduledValues(t);
        old.gain.gain.setValueAtTime(old.gain.gain.value, t);
        old.gain.gain.linearRampToValueAtTime(0, t + 2.5);
        old.timers.forEach(clearTimeout);
        setTimeout(() => old.nodes.forEach(n => { try { n.stop ? n.stop() : n.disconnect(); } catch (e) {} }), 2800);
      }

      const layer = this.ctx.createGain();
      layer.gain.value = 0;
      layer.gain.linearRampToValueAtTime(1, t + 3);
      layer.connect(this.master);

      const nodes = [];
      const timers = [];

      // общий фильтр темы
      const filt = this.ctx.createBiquadFilter();
      filt.type = 'lowpass';
      filt.frequency.value = cfg.filter;
      filt.connect(layer);
      nodes.push(filt);

      // дроны
      cfg.drones.forEach(dr => {
        const o = this.ctx.createOscillator();
        o.type = dr.type; o.frequency.value = dr.f;
        const g = this.ctx.createGain(); g.gain.value = dr.g;
        // медленная «дыхательная» модуляция
        const lfo = this.ctx.createOscillator();
        lfo.frequency.value = 0.05 + Math.random() * 0.06;
        const lg = this.ctx.createGain(); lg.gain.value = dr.g * 0.4;
        lfo.connect(lg); lg.connect(g.gain);
        o.connect(g); g.connect(filt);
        o.start(); lfo.start();
        nodes.push(o, lfo, g, lg);
      });

      // ветер (фильтрованный шум)
      if (cfg.wind > 0) {
        const src = this.ctx.createBufferSource();
        src.buffer = this.noiseBuffer(); src.loop = true;
        const bp = this.ctx.createBiquadFilter();
        bp.type = 'bandpass'; bp.frequency.value = 280; bp.Q.value = 0.7;
        const wg = this.ctx.createGain(); wg.gain.value = cfg.wind;
        const wlfo = this.ctx.createOscillator(); wlfo.frequency.value = 0.07;
        const wlg = this.ctx.createGain(); wlg.gain.value = cfg.wind * 0.3;
        wlfo.connect(wlg); wlg.connect(wg.gain);
        const flfo = this.ctx.createOscillator(); flfo.frequency.value = 0.045;
        const flg = this.ctx.createGain(); flg.gain.value = 110;
        flfo.connect(flg); flg.connect(bp.frequency);
        src.connect(bp); bp.connect(wg); wg.connect(layer);
        src.start(); wlfo.start(); flfo.start();
        nodes.push(src, wlfo, flfo, wg, bp, wlg, flg);
      }

      // треск костра: редкие короткие щелчки-искры, не сплошной шум
      if (cfg.crackle) {
        const pop = () => {
          if (this.currentName !== name || !this.ctx) return;
          const tt = this.ctx.currentTime;
          const src = this.ctx.createBufferSource();
          src.buffer = this.noiseBuffer();
          src.playbackRate.value = 1.4 + Math.random();
          const bp = this.ctx.createBiquadFilter();
          bp.type = 'bandpass';
          bp.frequency.value = 900 + Math.random() * 2200;
          bp.Q.value = 3;
          const g = this.ctx.createGain();
          const peak = cfg.crackle * (0.35 + Math.random() * 0.85);
          g.gain.setValueAtTime(0.0001, tt);
          g.gain.exponentialRampToValueAtTime(peak, tt + 0.004);
          g.gain.exponentialRampToValueAtTime(0.0001, tt + 0.035 + Math.random() * 0.06);
          src.connect(bp); bp.connect(g); g.connect(layer);
          src.start(tt, Math.random() * 2.5); src.stop(tt + 0.15);
          // иногда двойной щелчок подряд — живее
          const gap = Math.random() < 0.25 ? 60 + Math.random() * 80 : 220 + Math.random() * 600;
          timers.push(setTimeout(pop, gap));
        };
        timers.push(setTimeout(pop, 500));
      }

      // тревожный пульс
      if (cfg.pulse > 0) {
        const beat = () => {
          if (this.currentName !== name || !this.ctx) return;
          const tt = this.ctx.currentTime;
          const o = this.ctx.createOscillator();
          o.type = 'sine'; o.frequency.setValueAtTime(58, tt);
          o.frequency.exponentialRampToValueAtTime(36, tt + 0.25);
          const g = this.ctx.createGain();
          g.gain.setValueAtTime(0.0001, tt);
          g.gain.exponentialRampToValueAtTime(0.22, tt + 0.02);
          g.gain.exponentialRampToValueAtTime(0.0001, tt + 0.5);
          o.connect(g); g.connect(layer);
          o.start(tt); o.stop(tt + 0.6);
          timers.push(setTimeout(beat, cfg.pulse * 1000));
        };
        timers.push(setTimeout(beat, 700));
      }

      // редкие ноты-мелодия
      if (cfg.scale.length && cfg.noteGain > 0) {
        const note = () => {
          if (this.currentName !== name || !this.ctx) return;
          const tt = this.ctx.currentTime;
          const f = cfg.scale[Math.floor(Math.random() * cfg.scale.length)];
          const o = this.ctx.createOscillator();
          o.type = cfg.noteType || 'sine'; o.frequency.value = f;
          const o2 = this.ctx.createOscillator();
          o2.type = 'sine'; o2.frequency.value = f * 2.001;
          const g = this.ctx.createGain();
          const g2 = this.ctx.createGain(); g2.gain.value = 0.25;
          if (cfg.pluck) {
            // клавишная огибающая: быстрая атака, длинное затухание
            g.gain.setValueAtTime(0.0001, tt);
            g.gain.exponentialRampToValueAtTime(cfg.noteGain, tt + 0.015);
            g.gain.exponentialRampToValueAtTime(0.0001, tt + 2.6);
          } else {
            g.gain.setValueAtTime(0.0001, tt);
            g.gain.linearRampToValueAtTime(cfg.noteGain, tt + 1.2);
            g.gain.exponentialRampToValueAtTime(0.0001, tt + 4.5);
          }
          o.connect(g); o2.connect(g2); g2.connect(g); g.connect(layer);
          o.start(tt); o2.start(tt); o.stop(tt + 5); o2.stop(tt + 5);
          const [a, b] = cfg.noteEvery;
          timers.push(setTimeout(note, (a + Math.random() * (b - a)) * 1000));
        };
        timers.push(setTimeout(note, 1500 + Math.random() * 2000));
      }

      this.current = { name, gain: layer, nodes, timers };
    }

    // вызвать при первом жесте пользователя
    unlock() {
      this.ensure();
      if (!this.ctx) return;
      if (this.ctx.state === 'suspended') this.ctx.resume();
      if (this.currentName && !this.current) {
        const n = this.currentName;
        this.currentName = null;
        this.play(n);
      }
    }

    toggleMute() {
      this.muted = !this.muted;
      if (this.master) {
        const t = this.ctx.currentTime;
        this.master.gain.cancelScheduledValues(t);
        this.master.gain.linearRampToValueAtTime(this.muted ? 0 : 0.9, t + 0.4);
      }
      return this.muted;
    }

    // короткий звуковой акцент (удар/испуг)
    sting() {
      if (!this.ctx || this.muted) return;
      const t = this.ctx.currentTime;
      const o = this.ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(220, t);
      o.frequency.exponentialRampToValueAtTime(40, t + 0.7);
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.3, t + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 1.1);
      const f = this.ctx.createBiquadFilter();
      f.type = 'lowpass'; f.frequency.value = 900;
      o.connect(f); f.connect(g); g.connect(this.master);
      o.start(t); o.stop(t + 1.2);
    }
  }

  window.music = new MusicEngine();
})();
