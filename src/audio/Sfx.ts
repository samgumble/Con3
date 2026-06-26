type SfxName = "select" | "place" | "complete" | "train" | "win" | "deny";

interface Note {
  type: OscillatorType;
  freq: number;
  dur: number;
  vol: number;
  at: number; // seconds offset from trigger time
}

/**
 * Tiny procedural sound engine — synthesizes short tones with the Web Audio API.
 * No asset files, works offline and on GitHub Pages. Must be unlock()'d from a
 * user gesture (browsers block audio until then).
 */
class Sfx {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;

  unlock(): void {
    if (this.ctx) {
      if (this.ctx.state === "suspended") void this.ctx.resume();
      return;
    }
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    this.ctx = new Ctx();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.25;
    this.master.connect(this.ctx.destination);
  }

  play(name: SfxName): void {
    if (!this.ctx || !this.master) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    for (const n of this.recipe(name)) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = n.type;
      osc.frequency.value = n.freq;
      const start = now + n.at;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.linearRampToValueAtTime(n.vol, start + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + n.dur);
      osc.connect(gain);
      gain.connect(this.master);
      osc.start(start);
      osc.stop(start + n.dur + 0.02);
    }
  }

  private recipe(name: SfxName): Note[] {
    switch (name) {
      case "select":
        return [{ type: "square", freq: 660, dur: 0.07, vol: 0.25, at: 0 }];
      case "place":
        return [{ type: "sine", freq: 300, dur: 0.13, vol: 0.5, at: 0 }];
      case "train":
        return [
          { type: "triangle", freq: 520, dur: 0.1, vol: 0.4, at: 0 },
          { type: "triangle", freq: 780, dur: 0.1, vol: 0.4, at: 0.08 },
        ];
      case "complete":
        return [
          { type: "sine", freq: 523, dur: 0.12, vol: 0.4, at: 0 },
          { type: "sine", freq: 784, dur: 0.18, vol: 0.4, at: 0.1 },
        ];
      case "win":
        return [
          { type: "sine", freq: 523, dur: 0.18, vol: 0.5, at: 0 },
          { type: "sine", freq: 659, dur: 0.18, vol: 0.5, at: 0.16 },
          { type: "sine", freq: 784, dur: 0.18, vol: 0.5, at: 0.32 },
          { type: "sine", freq: 1047, dur: 0.45, vol: 0.5, at: 0.48 },
        ];
      case "deny":
        return [{ type: "square", freq: 150, dur: 0.16, vol: 0.35, at: 0 }];
    }
  }
}

export const sfx = new Sfx();
