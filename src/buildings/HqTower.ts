import {
  Mesh,
  MeshBuilder,
  Scene,
  StandardMaterial,
  Color3,
  Vector3,
  TransformNode,
} from "@babylonjs/core";
import type { ShadowGenerator } from "@babylonjs/core";
import { BuildingType } from "./buildingTypes";
import { Resources } from "../game/Resources";
import { Constructable } from "./Constructable";
import { Supplyable, BuildResource } from "./Supplyable";
import { sfx } from "../audio/Sfx";

const GROUND_Y = 0.4; // top of the foundation pad
const CORE_H = 7;
const SHELL_H = 6.6;

interface HqPhase {
  name: string;
  steel: number;
  concrete: number;
}

/**
 * The HQ Tower — the capstone, built in visible phases:
 *   1. Core   — concrete is poured (the structural column rises)
 *   2. Shell  — steel clads the core (the glass facade)
 *   3. Fitout — steel + concrete finish it (crown, antenna, polish)
 * Supply crews fetch steel/concrete from the depot and install() them here;
 * installing the last unit of the final phase wins the game.
 */
export class HqTower implements Constructable, Supplyable {
  readonly type: BuildingType;
  private phases: HqPhase[];
  private phaseIndex = 0;
  private installedSteel = 0;
  private installedConcrete = 0;
  private complete = false;

  private pad: Mesh;
  private core: Mesh;
  private shell: Mesh;
  private shellMat: StandardMaterial;
  private fitout: TransformNode;

  constructor(
    scene: Scene,
    type: BuildingType,
    position: Vector3,
    private resources: Resources,
    shadows?: ShadowGenerator
  ) {
    this.type = type;
    this.phases = (type.phases ?? []).map((p) => ({
      name: p.name,
      steel: p.steel ?? 0,
      concrete: p.concrete ?? 0,
    }));
    if (this.phases.length === 0) {
      this.phases = [{ name: "Build", steel: 0, concrete: 0 }];
    }
    const x = position.x;
    const z = position.z;

    this.pad = MeshBuilder.CreateBox("hq", { width: 5, depth: 5, height: 0.4 }, scene);
    this.pad.position.set(x, 0.2, z);
    const padMat = new StandardMaterial("hqPad", scene);
    padMat.diffuseColor = new Color3(0.3, 0.3, 0.32);
    this.pad.material = padMat;
    this.pad.metadata = { building: this };

    this.core = MeshBuilder.CreateBox("hqCore", { width: 2.2, depth: 2.2, height: CORE_H }, scene);
    this.core.position.set(x, GROUND_Y, z);
    const coreMat = new StandardMaterial("hqCoreMat", scene);
    coreMat.diffuseColor = new Color3(0.55, 0.55, 0.58); // concrete
    this.core.material = coreMat;
    this.core.metadata = { building: this };

    this.shell = MeshBuilder.CreateBox("hqShell", { width: 4.4, depth: 4.4, height: SHELL_H }, scene);
    this.shell.position.set(x, GROUND_Y, z);
    this.shellMat = new StandardMaterial("hqShellMat", scene);
    this.shellMat.diffuseColor = new Color3(0.4, 0.62, 0.8); // glass
    this.shell.material = this.shellMat;
    this.shell.metadata = { building: this };

    this.fitout = new TransformNode("hqFitout", scene);
    this.fitout.position.set(x, GROUND_Y + SHELL_H, z);
    const crown = MeshBuilder.CreateBox("hqCrown", { width: 4.8, depth: 4.8, height: 0.6 }, scene);
    crown.position.set(0, 0.3, 0);
    const crownMat = new StandardMaterial("hqCrownMat", scene);
    crownMat.diffuseColor = new Color3(0.9, 0.78, 0.25); // gold accent
    crown.material = crownMat;
    crown.parent = this.fitout;
    const antenna = MeshBuilder.CreateCylinder("hqAntenna", { diameter: 0.2, height: 2 }, scene);
    antenna.position.set(0, 1.6, 0);
    antenna.material = crownMat;
    antenna.parent = this.fitout;

    if (shadows) {
      for (const m of [this.pad, this.core, this.shell, crown, antenna]) {
        shadows.addShadowCaster(m);
      }
    }

    this.updateVisual();
  }

  get isComplete(): boolean {
    return this.complete;
  }

  get position(): Vector3 {
    return this.pad.position;
  }

  /** Units still required for the current phase. */
  needs(): { steel: number; concrete: number } {
    if (this.complete) return { steel: 0, concrete: 0 };
    const p = this.phases[this.phaseIndex];
    return {
      steel: Math.max(0, p.steel - this.installedSteel),
      concrete: Math.max(0, p.concrete - this.installedConcrete),
    };
  }

  /** Install one unit of a resource into the current phase. */
  install(t: BuildResource): void {
    if (this.complete) return;
    const p = this.phases[this.phaseIndex];
    if (t === "steel" && this.installedSteel < p.steel) this.installedSteel += 1;
    else if (t === "concrete" && this.installedConcrete < p.concrete) this.installedConcrete += 1;

    this.updateVisual();

    if (this.installedSteel >= p.steel && this.installedConcrete >= p.concrete) {
      this.phaseIndex += 1;
      this.installedSteel = 0;
      this.installedConcrete = 0;
      if (this.phaseIndex >= this.phases.length) this.finish();
      else this.updateVisual();
    }
  }

  /** HQ progresses via install(), not over time — no-op for the build system. */
  advance(_dt: number): void {}

  /** Current phase + install counts, or null once complete. */
  get statusText(): string | null {
    if (this.complete) return null;
    const p = this.phases[this.phaseIndex];
    const parts: string[] = [];
    if (p.steel > 0) parts.push(`steel ${this.installedSteel}/${p.steel}`);
    if (p.concrete > 0) parts.push(`concrete ${this.installedConcrete}/${p.concrete}`);
    return `HQ Tower — ${p.name}: ${parts.join(", ")}`;
  }

  private get phaseProgress(): number {
    const p = this.phases[this.phaseIndex];
    const req = p.steel + p.concrete;
    return req <= 0 ? 1 : (this.installedSteel + this.installedConcrete) / req;
  }

  private updateVisual(): void {
    const done = this.complete;
    const coreP = done || this.phaseIndex > 0 ? 1 : this.phaseProgress;
    const shellP =
      done || this.phaseIndex > 1 ? 1 : this.phaseIndex === 1 ? this.phaseProgress : 0;
    const fitP = done ? 1 : this.phaseIndex === 2 ? this.phaseProgress : 0;

    this.grow(this.core, CORE_H, coreP);
    this.grow(this.shell, SHELL_H, shellP);
    this.shellMat.alpha = shellP <= 0 || done || this.phaseIndex > 1 ? 1 : 0.45 + 0.55 * shellP;

    if (fitP <= 0.001) {
      this.fitout.setEnabled(false);
    } else {
      this.fitout.setEnabled(true);
      this.fitout.scaling.setAll(fitP);
    }
  }

  private grow(mesh: Mesh, fullHeight: number, p: number): void {
    if (p <= 0.001) {
      mesh.setEnabled(false);
      return;
    }
    mesh.setEnabled(true);
    mesh.scaling.y = p;
    mesh.position.y = GROUND_Y + (fullHeight * p) / 2;
  }

  private finish(): void {
    this.complete = true;
    this.updateVisual();
    this.type.apply(this.resources);
    sfx.play("win");
  }
}
