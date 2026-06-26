import { Scene, Vector3 } from "@babylonjs/core";
import type { ShadowGenerator } from "@babylonjs/core";
import { Resources } from "../game/Resources";
import { Worker } from "../units/Worker";
import { sfx } from "../audio/Sfx";

/**
 * The Site Office's worker production: a button that spends Funding to queue a
 * worker, gated by the Labor cap. Labor is reserved when queued; the worker
 * spawns after a short training time.
 */
export class TrainingController {
  readonly cost = 75;
  private trainTime = 3;
  private queue = 0;
  private timer = 0;
  private btn: HTMLButtonElement | null = null;

  constructor(
    private scene: Scene,
    private resources: Resources,
    private workers: Worker[],
    private spawn: Vector3,
    private shadows?: ShadowGenerator
  ) {
    const menu = document.getElementById("trainmenu");
    if (menu) {
      this.btn = document.createElement("button");
      this.btn.className = "buildbtn";
      this.btn.onclick = () => this.tryTrain();
      menu.appendChild(this.btn);
    }
    this.refreshButton();
  }

  private tryTrain(): void {
    if (this.resources.labor >= this.resources.laborCap) {
      sfx.play("deny");
      return; // at cap
    }
    if (this.resources.funding < this.cost) {
      sfx.play("deny");
      return; // can't afford
    }
    this.resources.funding -= this.cost;
    this.resources.labor += 1; // reserve population immediately
    this.queue += 1;
    sfx.play("train");
  }

  update(dt: number): void {
    if (this.queue > 0) {
      this.timer += dt;
      if (this.timer >= this.trainTime) {
        this.timer -= this.trainTime;
        this.queue -= 1;
        const jitter = (this.workers.length % 3) * 1.2;
        const pos = new Vector3(this.spawn.x + jitter, this.spawn.y, this.spawn.z);
        this.workers.push(
          new Worker(this.scene, pos, this.resources, this.shadows)
        );
      }
    }
    this.refreshButton();
  }

  private refreshButton(): void {
    if (!this.btn) return;
    const atCap = this.resources.labor >= this.resources.laborCap;
    const pct = Math.floor((this.timer / this.trainTime) * 100);
    const status =
      this.queue > 0
        ? `Training ${pct}%${this.queue > 1 ? ` (+${this.queue - 1})` : ""}`
        : atCap
          ? "Labor cap reached"
          : "+1 Worker";
    this.btn.innerHTML =
      `<b>Train Worker</b><span>${status}</span><small>${this.cost} funding</small>`;
    const usable = this.queue > 0 || (!atCap && this.resources.funding >= this.cost);
    this.btn.style.opacity = usable ? "1" : "0.55";
  }
}
