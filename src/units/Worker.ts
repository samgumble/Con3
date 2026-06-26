import {
  Mesh,
  MeshBuilder,
  Scene,
  StandardMaterial,
  Color3,
  Vector3,
} from "@babylonjs/core";
import { Resources } from "../game/Resources";
import type { Constructable } from "../buildings/Constructable";
import type { ShadowGenerator } from "@babylonjs/core";

type HaulPhase = "toSource" | "harvest" | "toDrop";

interface HaulSource {
  position: Vector3;
  /** Try to take one unit from the source; false if it's empty. */
  take: () => boolean;
}

interface HaulTask {
  source: HaulSource;
  dropPos: Vector3;
  phase: HaulPhase;
  timer: number;
}

const SOURCE_STOP = 1.8; // stop this far from a resource source (pile/depot)
const DROP_STOP = 3.0; // stop this far from the (larger) drop-off building
const BUILD_STOP = 2.6; // stop this far from a construction site

/**
 * A worker (laborer). Supports a manual move, an auto-repeating gather loop, and
 * a build task. Only one task is active at a time; issuing one cancels the rest.
 */
export class Worker {
  readonly mesh: Mesh;
  speed = 6; // world units / second
  harvestTime = 1.3; // seconds to fill up at a node
  carryAmount = 10; // materials carried per trip

  private moveDest: Vector3 | null = null;
  private haul: HaulTask | null = null;
  private buildTask: { building: Constructable } | null = null;
  private carrying = 0;
  private carryIndicator: Mesh;

  constructor(
    scene: Scene,
    position: Vector3,
    private resources: Resources,
    shadows?: ShadowGenerator
  ) {
    this.mesh = MeshBuilder.CreateCapsule(
      "worker",
      { radius: 0.4, height: 1.4 },
      scene
    );
    this.mesh.position.copyFrom(position);

    const mat = new StandardMaterial("workerMat", scene);
    mat.diffuseColor = new Color3(0.95, 0.45, 0.1); // hi-vis vest
    this.mesh.material = mat;
    this.mesh.metadata = { worker: this };

    // Head.
    const head = MeshBuilder.CreateSphere("head", { diameter: 0.5 }, scene);
    head.parent = this.mesh;
    head.position.set(0, 0.8, 0);
    const headMat = new StandardMaterial("headMat", scene);
    headMat.diffuseColor = new Color3(0.9, 0.75, 0.62);
    head.material = headMat;

    // Hard hat.
    const hat = MeshBuilder.CreateCylinder("hat", { diameter: 0.56, height: 0.2 }, scene);
    hat.parent = this.mesh;
    hat.position.set(0, 1.0, 0);
    const hatMat = new StandardMaterial("hatMat", scene);
    hatMat.diffuseColor = new Color3(1, 0.8, 0.1);
    hat.material = hatMat;

    this.carryIndicator = MeshBuilder.CreateBox("cargo", { size: 0.4 }, scene);
    this.carryIndicator.parent = this.mesh;
    this.carryIndicator.position.set(0, 0.45, 0.5); // carried in front of the chest
    const cargoMat = new StandardMaterial("cargoMat", scene);
    cargoMat.diffuseColor = new Color3(0.6, 0.6, 0.6);
    this.carryIndicator.material = cargoMat;
    this.carryIndicator.setEnabled(false);

    shadows?.addShadowCaster(this.mesh, true); // include hat/cargo children
  }

  private clearTasks(): void {
    this.moveDest = null;
    this.haul = null;
    this.buildTask = null;
  }

  /** Manual move command. */
  moveTo(point: Vector3): void {
    this.clearTasks();
    this.moveDest = new Vector3(point.x, this.mesh.position.y, point.z);
  }

  /** Auto-gather from an unlimited source (e.g. the raw material pile). */
  assignGather(nodePos: Vector3, dropPos: Vector3): void {
    this.setHaul({ position: nodePos.clone(), take: () => true }, dropPos);
  }

  /** Auto-haul from a finite source (e.g. a depot), retrying when it's empty. */
  assignHaul(sourcePos: Vector3, take: () => boolean, dropPos: Vector3): void {
    this.setHaul({ position: sourcePos.clone(), take }, dropPos);
  }

  private setHaul(source: HaulSource, dropPos: Vector3): void {
    const wasCarrying = this.carrying > 0;
    this.clearTasks();
    this.haul = {
      source,
      dropPos: dropPos.clone(),
      phase: wasCarrying ? "toDrop" : "toSource",
      timer: 0,
    };
  }

  /** Assign this worker to construct a building. */
  assignBuild(building: Constructable): void {
    this.clearTasks();
    this.buildTask = { building };
  }

  get isMoving(): boolean {
    return this.moveDest !== null || this.haul !== null || this.buildTask !== null;
  }

  update(dt: number): void {
    if (this.moveDest) {
      if (this.stepToward(this.moveDest, dt)) this.moveDest = null;
    } else if (this.haul) {
      this.updateHaul(this.haul, dt);
    } else if (this.buildTask) {
      this.updateBuild(this.buildTask.building, dt);
    }
  }

  private updateHaul(h: HaulTask, dt: number): void {
    switch (h.phase) {
      case "toSource":
        if (this.stepToward(h.source.position, dt, SOURCE_STOP)) {
          h.phase = "harvest";
          h.timer = 0;
        }
        break;
      case "harvest":
        h.timer += dt;
        if (h.timer >= this.harvestTime) {
          if (h.source.take()) {
            this.setCarrying(this.carryAmount);
            h.phase = "toDrop";
          } else {
            h.timer = 0; // source empty — wait and retry (e.g. depot awaiting a truck)
          }
        }
        break;
      case "toDrop":
        if (this.stepToward(h.dropPos, dt, DROP_STOP)) {
          this.resources.add("materials", this.carrying);
          this.setCarrying(0);
          h.phase = "toSource";
        }
        break;
    }
  }

  private updateBuild(building: Constructable, dt: number): void {
    if (building.isComplete) {
      this.buildTask = null;
      return;
    }
    // Walk to the site, then advance construction while standing there.
    if (this.stepToward(building.position, dt, BUILD_STOP)) {
      building.advance(dt);
      if (building.isComplete) this.buildTask = null;
    }
  }

  /** Move toward target; returns true once within stopDist (+ tolerance). */
  private stepToward(target: Vector3, dt: number, stopDist = 0.05): boolean {
    const pos = this.mesh.position;
    const to = target.subtract(pos);
    to.y = 0;
    const remaining = to.length() - stopDist;
    if (remaining <= 0.02) return true;

    const dir = to.normalize();
    const step = Math.min(this.speed * dt, remaining);
    pos.addInPlace(dir.scale(step));
    this.mesh.rotation.y = Math.atan2(dir.x, dir.z);
    return false;
  }

  private setCarrying(amount: number): void {
    this.carrying = amount;
    this.carryIndicator.setEnabled(amount > 0);
  }
}
