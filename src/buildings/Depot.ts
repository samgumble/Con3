import {
  Mesh,
  MeshBuilder,
  Scene,
  StandardMaterial,
  Color3,
  Vector3,
} from "@babylonjs/core";
import type { ShadowGenerator } from "@babylonjs/core";
import { Resources } from "../game/Resources";

const DISPLAY = 8; // max crates drawn per resource

/**
 * The supply depot: trucks drop steel and concrete here (tracked on Resources),
 * shown as two crate stacks. Supply crews pick them up and carry them to the HQ.
 */
export class Depot {
  readonly mesh: Mesh; // platform (pickable; metadata.depot)
  private steelCrates: Mesh[] = [];
  private concreteCrates: Mesh[] = [];

  constructor(
    scene: Scene,
    position: Vector3,
    private resources: Resources,
    shadows?: ShadowGenerator
  ) {
    this.mesh = MeshBuilder.CreateBox("depot", { width: 6, depth: 4, height: 0.4 }, scene);
    this.mesh.position.set(position.x, 0.2, position.z);
    const mat = new StandardMaterial("depotMat", scene);
    mat.diffuseColor = new Color3(0.28, 0.3, 0.34);
    this.mesh.material = mat;
    this.mesh.metadata = { depot: this };

    const wall = MeshBuilder.CreateBox("depotWall", { width: 6, depth: 0.3, height: 1.6 }, scene);
    wall.position.set(position.x, 1.0, position.z + 1.85);
    wall.material = mat;
    wall.isPickable = false;
    shadows?.addShadowCaster(wall);

    const steelMat = new StandardMaterial("steelCrate", scene);
    steelMat.diffuseColor = new Color3(0.45, 0.5, 0.6); // blue-grey steel
    const concreteMat = new StandardMaterial("concreteCrate", scene);
    concreteMat.diffuseColor = new Color3(0.75, 0.75, 0.72); // light grey concrete

    const rows = [-1.2, -0.4, 0.4, 1.2];
    const make = (cols: number[], material: StandardMaterial, into: Mesh[]) => {
      for (const x of cols) {
        for (const z of rows) {
          const c = MeshBuilder.CreateBox("crate", { size: 0.85 }, scene);
          c.position.set(position.x + x, 0.85, position.z + z);
          c.material = material;
          c.isPickable = false;
          shadows?.addShadowCaster(c);
          into.push(c);
        }
      }
    };
    make([-2.1, -0.9], steelMat, this.steelCrates); // steel: left half
    make([0.9, 2.1], concreteMat, this.concreteCrates); // concrete: right half

    shadows?.addShadowCaster(this.mesh);
    this.sync();
  }

  get position(): Vector3 {
    return this.mesh.position;
  }

  /** Refresh crate visuals from the current stock. */
  update(): void {
    this.sync();
  }

  private sync(): void {
    const s = Math.min(this.resources.steel, DISPLAY);
    const c = Math.min(this.resources.concrete, DISPLAY);
    for (let i = 0; i < this.steelCrates.length; i++) this.steelCrates[i].setEnabled(i < s);
    for (let i = 0; i < this.concreteCrates.length; i++) this.concreteCrates[i].setEnabled(i < c);
  }
}
