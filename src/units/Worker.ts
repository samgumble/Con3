import {
  Mesh,
  MeshBuilder,
  Scene,
  StandardMaterial,
  Color3,
  Vector3,
} from "@babylonjs/core";

/**
 * A worker (laborer). For M1 it just moves smoothly to a commanded point.
 * Later milestones add gathering, building, and carrying state.
 */
export class Worker {
  readonly mesh: Mesh;
  speed = 6; // world units / second
  private destination: Vector3 | null = null;

  constructor(scene: Scene, position: Vector3) {
    this.mesh = MeshBuilder.CreateCapsule(
      "worker",
      { radius: 0.4, height: 1.4 },
      scene
    );
    this.mesh.position.copyFrom(position);

    const mat = new StandardMaterial("workerMat", scene);
    mat.diffuseColor = new Color3(0.2, 0.5, 0.9);
    this.mesh.material = mat;

    // Tag the mesh so picking can resolve it back to this Worker.
    this.mesh.metadata = { worker: this };
  }

  /** Command the worker to walk to a point on the ground. */
  moveTo(point: Vector3): void {
    this.destination = new Vector3(point.x, this.mesh.position.y, point.z);
  }

  get isMoving(): boolean {
    return this.destination !== null;
  }

  /** Advance movement. dt is in seconds. */
  update(dt: number): void {
    if (!this.destination) return;

    const pos = this.mesh.position;
    const toDest = this.destination.subtract(pos);
    toDest.y = 0;
    const dist = toDest.length();

    if (dist < 0.05) {
      this.destination = null;
      return;
    }

    const dir = toDest.normalize();
    const step = Math.min(this.speed * dt, dist);
    pos.addInPlace(dir.scale(step));

    // Face the direction of travel.
    this.mesh.rotation.y = Math.atan2(dir.x, dir.z);
  }
}
