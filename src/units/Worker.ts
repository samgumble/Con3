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
import type { Supplyable, BuildResource } from "../buildings/Supplyable";
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
const LOAD_TIME = 0.5; // seconds to load a crate at the depot
const INSTALL_TIME = 0.8; // seconds to install a unit at the HQ

type SupplyPhase = "toDepot" | "load" | "toSite" | "install";

interface SupplyTask {
  depotPos: Vector3;
  target: Supplyable;
  phase: SupplyPhase;
  carrying: BuildResource | null;
  timer: number;
}

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
  private supply: SupplyTask | null = null;
  private carrying = 0;
  private carryIndicator: Mesh;
  private cargoMat: StandardMaterial;

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
    this.cargoMat = new StandardMaterial("cargoMat", scene);
    this.cargoMat.diffuseColor = new Color3(0.6, 0.6, 0.6);
    this.carryIndicator.material = this.cargoMat;
    this.carryIndicator.setEnabled(false);

    shadows?.addShadowCaster(this.mesh, true); // include hat/cargo children
  }

  private clearTasks(): void {
    this.moveDest = null;
    this.haul = null;
    this.buildTask = null;
    this.supply = null;
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

  /** Assign this worker as a supply crew: depot -> carry -> install at the target. */
  assignSupply(depotPos: Vector3, target: Supplyable): void {
    this.clearTasks();
    this.supply = { depotPos: depotPos.clone(), target, phase: "toDepot", carrying: null, timer: 0 };
  }

  get isMoving(): boolean {
    return (
      this.moveDest !== null ||
      this.haul !== null ||
      this.buildTask !== null ||
      this.supply !== null
    );
  }

  update(dt: number): void {
    if (this.moveDest) {
      if (this.stepToward(this.moveDest, dt)) this.moveDest = null;
    } else if (this.haul) {
      this.updateHaul(this.haul, dt);
    } else if (this.buildTask) {
      this.updateBuild(this.buildTask.building, dt);
    } else if (this.supply) {
      this.updateSupply(this.supply, dt);
    }
  }

  private updateSupply(s: SupplyTask, dt: number): void {
    if (s.target.isComplete) {
      this.supply = null;
      this.setCargo(null);
      return;
    }
    switch (s.phase) {
      case "toDepot":
        if (this.stepToward(s.depotPos, dt, SOURCE_STOP)) {
          s.phase = "load";
          s.timer = 0;
        }
        break;
      case "load": {
        // Carry whatever the current phase still needs and the depot has.
        const need = s.target.needs();
        let type: BuildResource | null = null;
        if (need.steel > 0 && this.resources.steel > 0) type = "steel";
        else if (need.concrete > 0 && this.resources.concrete > 0) type = "concrete";
        if (!type) return; // nothing to carry yet — wait for a truck
        s.timer += dt;
        if (s.timer >= LOAD_TIME) {
          if (type === "steel" && this.resources.steel > 0) this.resources.steel -= 1;
          else if (type === "concrete" && this.resources.concrete > 0) this.resources.concrete -= 1;
          else {
            s.timer = 0;
            return;
          }
          s.carrying = type;
          this.setCargo(type);
          s.phase = "toSite";
        }
        break;
      }
      case "toSite":
        if (this.stepToward(s.target.position, dt, BUILD_STOP)) {
          s.phase = "install";
          s.timer = 0;
        }
        break;
      case "install":
        s.timer += dt;
        if (s.timer >= INSTALL_TIME) {
          if (s.carrying) s.target.install(s.carrying);
          s.carrying = null;
          this.setCargo(null);
          s.phase = "toDepot";
        }
        break;
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
    this.setCargo(amount > 0 ? "materials" : null);
  }

  private setCargo(kind: "materials" | "steel" | "concrete" | null): void {
    if (!kind) {
      this.carryIndicator.setEnabled(false);
      return;
    }
    this.carryIndicator.setEnabled(true);
    this.cargoMat.diffuseColor =
      kind === "steel"
        ? new Color3(0.45, 0.5, 0.6)
        : kind === "concrete"
          ? new Color3(0.78, 0.78, 0.74)
          : new Color3(0.6, 0.6, 0.6);
  }
}
