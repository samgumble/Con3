import {
  MeshBuilder,
  Scene,
  StandardMaterial,
  Color3,
  Vector3,
  TransformNode,
} from "@babylonjs/core";
import type { ShadowGenerator } from "@babylonjs/core";
import { Resources } from "../game/Resources";
import { BuildResource } from "../buildings/Supplyable";

/**
 * A delivery truck carrying steel or concrete. Drives in from the edge to the
 * depot, unloads into the stockpile, then drives off and despawns.
 */
export class Truck {
  readonly root: TransformNode;
  done = false;
  private speed = 9;
  private waypoints: Vector3[];
  private wp = 0;
  private unloadTimer = 0;

  constructor(
    scene: Scene,
    start: Vector3,
    drop: Vector3,
    exit: Vector3,
    private resources: Resources,
    private cargo: BuildResource,
    private load: number,
    shadows?: ShadowGenerator
  ) {
    this.root = new TransformNode("truck", scene);
    this.root.position.copyFrom(start);
    this.waypoints = [drop.clone(), exit.clone()];

    const bodyMat = new StandardMaterial("truckBody", scene);
    bodyMat.diffuseColor =
      cargo === "steel" ? new Color3(0.35, 0.45, 0.65) : new Color3(0.7, 0.7, 0.68);
    const cabMat = new StandardMaterial("truckCab", scene);
    cabMat.diffuseColor = new Color3(0.2, 0.25, 0.3);
    const wheelMat = new StandardMaterial("truckWheel", scene);
    wheelMat.diffuseColor = new Color3(0.1, 0.1, 0.1);

    const bed = MeshBuilder.CreateBox("bed", { width: 3, height: 1, depth: 1.6 }, scene);
    bed.position.set(0, 0.8, 0);
    bed.material = bodyMat;
    bed.parent = this.root;

    const cab = MeshBuilder.CreateBox("cab", { width: 1, height: 1.1, depth: 1.6 }, scene);
    cab.position.set(1.7, 0.85, 0);
    cab.material = cabMat;
    cab.parent = this.root;

    for (const [x, z] of [
      [-0.9, 0.85],
      [-0.9, -0.85],
      [0.9, 0.85],
      [0.9, -0.85],
    ] as [number, number][]) {
      const wheel = MeshBuilder.CreateCylinder("wheel", { diameter: 0.7, height: 0.3 }, scene);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(x, 0.35, z);
      wheel.material = wheelMat;
      wheel.parent = this.root;
    }

    for (const m of this.root.getChildMeshes()) shadows?.addShadowCaster(m);
  }

  update(dt: number): void {
    if (this.done) return;
    const target = this.waypoints[this.wp];
    if (!this.driveTo(target, dt)) return;

    if (this.wp === 0) {
      this.unloadTimer += dt;
      if (this.unloadTimer >= 2) {
        if (this.cargo === "steel") {
          this.resources.steel = Math.min(this.resources.steelCap, this.resources.steel + this.load);
        } else {
          this.resources.concrete = Math.min(
            this.resources.concreteCap,
            this.resources.concrete + this.load
          );
        }
        this.wp = 1;
      }
    } else {
      this.done = true;
      this.root.dispose();
    }
  }

  private driveTo(target: Vector3, dt: number): boolean {
    const pos = this.root.position;
    const to = target.subtract(pos);
    to.y = 0;
    const dist = to.length();
    if (dist <= 0.3) return true;
    const dir = to.normalize();
    pos.addInPlace(dir.scale(Math.min(this.speed * dt, dist)));
    this.root.rotation.y = Math.atan2(dir.x, dir.z);
    return false;
  }
}
