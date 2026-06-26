import {
  Mesh,
  MeshBuilder,
  Scene,
  StandardMaterial,
  Color3,
  Vector3,
} from "@babylonjs/core";
import type { ShadowGenerator } from "@babylonjs/core";

/**
 * A supply depot: trucks drop off crates here, workers haul them away.
 * Holds a stock of "supplies" (crate units) shown as a stack of crate meshes.
 */
export class Depot {
  readonly mesh: Mesh; // platform (pickable; metadata.depot)
  readonly capacity = 12;
  supplies = 4;
  private crates: Mesh[] = [];

  constructor(scene: Scene, position: Vector3, shadows?: ShadowGenerator) {
    this.mesh = MeshBuilder.CreateBox(
      "depot",
      { width: 6, depth: 4, height: 0.4 },
      scene
    );
    this.mesh.position.set(position.x, 0.2, position.z);
    const mat = new StandardMaterial("depotMat", scene);
    mat.diffuseColor = new Color3(0.28, 0.3, 0.34);
    this.mesh.material = mat;
    this.mesh.metadata = { depot: this };

    // Back wall so it reads as a loading dock (on the far side from the office).
    const wall = MeshBuilder.CreateBox(
      "depotWall",
      { width: 6, depth: 0.3, height: 1.6 },
      scene
    );
    wall.position.set(position.x, 1.0, position.z + 1.85);
    wall.material = mat;
    wall.isPickable = false;
    shadows?.addShadowCaster(wall);

    const crateMat = new StandardMaterial("crateMat", scene);
    crateMat.diffuseColor = new Color3(0.55, 0.4, 0.2);

    const cols = [-1.5, 0, 1.5];
    const rows = [-1.2, -0.4, 0.4, 1.2];
    for (const z of rows) {
      for (const x of cols) {
        const crate = MeshBuilder.CreateBox("crate", { size: 0.9 }, scene);
        crate.position.set(position.x + x, 0.85, position.z + z);
        crate.material = crateMat;
        crate.isPickable = false;
        this.crates.push(crate);
        shadows?.addShadowCaster(crate);
      }
    }

    shadows?.addShadowCaster(this.mesh);
    this.updateCrates();
  }

  get position(): Vector3 {
    return this.mesh.position;
  }

  addSupply(n: number): void {
    this.supplies = Math.min(this.capacity, this.supplies + n);
    this.updateCrates();
  }

  /** Remove one crate; returns false if empty. */
  takeSupply(): boolean {
    if (this.supplies <= 0) return false;
    this.supplies -= 1;
    this.updateCrates();
    return true;
  }

  private updateCrates(): void {
    for (let i = 0; i < this.crates.length; i++) {
      this.crates[i].setEnabled(i < this.supplies);
    }
  }
}
