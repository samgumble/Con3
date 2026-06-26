import {
  Mesh,
  MeshBuilder,
  Scene,
  StandardMaterial,
  Color3,
  Vector3,
} from "@babylonjs/core";
import { Resources } from "../game/Resources";
import type { Building } from "../buildings/Building";
import type { ShadowGenerator } from "@babylonjs/core";

type GatherPhase = "toNode" | "harvest" | "toDrop";

interface GatherTask {
  nodePos: Vector3;
  dropPos: Vector3;
  phase: GatherPhase;
  timer: number;
}

const NODE_STOP = 1.6; // stop this far from the resource node
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
  private gather: GatherTask | null = null;
  private buildTask: { building: Building } | null = null;
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
    mat.diffuseColor = new Color3(0.2, 0.5, 0.9);
    this.mesh.material = mat;
    this.mesh.metadata = { worker: this };

    // Hard hat.
    const hat = MeshBuilder.CreateCylinder("hat", { diameter: 0.62, height: 0.22 }, scene);
    hat.parent = this.mesh;
    hat.position.set(0, 0.85, 0);
    const hatMat = new StandardMaterial("hatMat", scene);
    hatMat.diffuseColor = new Color3(1, 0.78, 0.1);
    hat.material = hatMat;

    this.carryIndicator = MeshBuilder.CreateBox("cargo", { size: 0.4 }, scene);
    this.carryIndicator.parent = this.mesh;
    this.carryIndicator.position.set(0, 1.1, 0);
    const cargoMat = new StandardMaterial("cargoMat", scene);
    cargoMat.diffuseColor = new Color3(0.6, 0.6, 0.6);
    this.carryIndicator.material = cargoMat;
    this.carryIndicator.setEnabled(false);

    shadows?.addShadowCaster(this.mesh, true); // include hat/cargo children
  }

  private clearTasks(): void {
    this.moveDest = null;
    this.gather = null;
    this.buildTask = null;
  }

  /** Manual move command. */
  moveTo(point: Vector3): void {
    this.clearTasks();
    this.moveDest = new Vector3(point.x, this.mesh.position.y, point.z);
  }

  /** Start (or resume) auto-gathering between a node and a drop-off. */
  assignGather(nodePos: Vector3, dropPos: Vector3): void {
    const wasCarrying = this.carrying > 0;
    this.clearTasks();
    this.gather = {
      nodePos: nodePos.clone(),
      dropPos: dropPos.clone(),
      phase: wasCarrying ? "toDrop" : "toNode",
      timer: 0,
    };
  }

  /** Assign this worker to construct a building. */
  assignBuild(building: Building): void {
    this.clearTasks();
    this.buildTask = { building };
  }

  get isMoving(): boolean {
    return this.moveDest !== null || this.gather !== null || this.buildTask !== null;
  }

  update(dt: number): void {
    if (this.moveDest) {
      if (this.stepToward(this.moveDest, dt)) this.moveDest = null;
    } else if (this.gather) {
      this.updateGather(this.gather, dt);
    } else if (this.buildTask) {
      this.updateBuild(this.buildTask.building, dt);
    }
  }

  private updateGather(g: GatherTask, dt: number): void {
    switch (g.phase) {
      case "toNode":
        if (this.stepToward(g.nodePos, dt, NODE_STOP)) {
          g.phase = "harvest";
          g.timer = 0;
        }
        break;
      case "harvest":
        g.timer += dt;
        if (g.timer >= this.harvestTime) {
          this.setCarrying(this.carryAmount);
          g.phase = "toDrop";
        }
        break;
      case "toDrop":
        if (this.stepToward(g.dropPos, dt, DROP_STOP)) {
          this.resources.add("materials", this.carrying);
          this.setCarrying(0);
          g.phase = "toNode";
        }
        break;
    }
  }

  private updateBuild(building: Building, dt: number): void {
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
