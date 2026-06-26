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
import { loadModel } from "../assets/loadModel";
import { sfx } from "../audio/Sfx";

/**
 * A placed building. Starts as a translucent stub and grows/solidifies as a
 * worker advances its construction; applies its type effect on completion.
 */
export class Building implements Constructable {
  readonly mesh: Mesh;
  readonly type: BuildingType;
  progress = 0;
  private complete = false;
  private mat: StandardMaterial;
  private modelNode: TransformNode | null = null;

  constructor(
    scene: Scene,
    type: BuildingType,
    position: Vector3,
    private resources: Resources,
    shadows?: ShadowGenerator
  ) {
    this.type = type;
    this.mesh = MeshBuilder.CreateBox(
      type.id,
      { width: type.size.w, depth: type.size.d, height: type.size.h },
      scene
    );
    this.mesh.position.set(position.x, type.size.h / 2, position.z);

    this.mat = new StandardMaterial(`${type.id}Mat`, scene);
    this.mat.diffuseColor = type.color.clone();
    this.mesh.material = this.mat;
    this.mesh.metadata = { building: this };
    shadows?.addShadowCaster(this.mesh);

    // If a finished model is configured, load it now and reveal it on completion.
    // The box stays as the "under construction" scaffolding until then.
    if (type.model) {
      loadModel(scene, type.model.file, {
        position: new Vector3(position.x, type.model.yOffset ?? 0, position.z),
        scale: type.model.scale,
        rotationY: type.model.rotationY,
        shadows,
      })
        .then((node) => {
          this.modelNode = node;
          node.setEnabled(this.complete);
        })
        .catch((e) => console.error("building model load failed:", e));
    }

    this.applyVisual();
  }

  get isComplete(): boolean {
    return this.complete;
  }

  get position(): Vector3 {
    return this.mesh.position;
  }

  /** Advance construction by dt seconds (called by the building's worker). */
  advance(dt: number): void {
    if (this.complete) return;
    this.progress = Math.min(1, this.progress + dt / this.type.buildTime);
    this.applyVisual();
    if (this.progress >= 1) this.finish();
  }

  private applyVisual(): void {
    // Rise from the ground and fade in while under construction.
    const grown = Math.max(0.05, this.progress);
    this.mesh.scaling.y = grown;
    this.mesh.position.y = (this.type.size.h * grown) / 2;
    this.mat.alpha = this.complete ? 1 : 0.5 + 0.5 * this.progress;
    this.mat.emissiveColor = this.complete
      ? Color3.Black()
      : new Color3(0.15, 0.15, 0.0); // faint "under construction" glow
  }

  private finish(): void {
    this.complete = true;
    if (this.type.model) {
      // Swap the scaffolding box for the finished model.
      this.mesh.setEnabled(false);
      if (this.modelNode) this.modelNode.setEnabled(true);
    } else {
      this.applyVisual();
    }
    this.type.apply(this.resources);
    sfx.play(this.type.goal ? "win" : "complete");
  }
}
