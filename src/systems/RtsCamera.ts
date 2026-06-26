import {
  ArcRotateCamera,
  Scene,
  Vector3,
  PointerEventTypes,
} from "@babylonjs/core";

/**
 * RTS-style camera: fixed overhead angle, pan with WASD / arrows / screen-edge
 * scrolling, zoom with the mouse wheel. Orbit is disabled so the left mouse
 * button is free for unit selection.
 */
export class RtsCamera {
  readonly camera: ArcRotateCamera;

  private keys = new Set<string>();
  private hasPointer = false;

  private panSpeed = 22;
  private edgeMargin = 28; // px from the screen edge that triggers panning
  private minRadius = 12;
  private maxRadius = 55;
  private bounds = 22; // half-extent the camera target may travel from origin

  constructor(
    private scene: Scene,
    private canvas: HTMLCanvasElement
  ) {
    this.camera = new ArcRotateCamera(
      "camera",
      -Math.PI / 2,
      Math.PI / 3.4,
      32,
      Vector3.Zero(),
      scene
    );
    this.camera.detachControl(); // we drive panning/zoom ourselves

    window.addEventListener("keydown", (e) => {
      const k = e.key.toLowerCase();
      this.keys.add(k);
      if (k.startsWith("arrow")) e.preventDefault();
    });
    window.addEventListener("keyup", (e) => this.keys.delete(e.key.toLowerCase()));
    canvas.addEventListener("pointermove", () => (this.hasPointer = true));
    canvas.addEventListener("pointerleave", () => (this.hasPointer = false));

    scene.onPointerObservable.add((pi) => {
      if (pi.type === PointerEventTypes.POINTERWHEEL) {
        const e = pi.event as WheelEvent;
        const next = this.camera.radius + Math.sign(e.deltaY) * 2.5;
        this.camera.radius = Math.min(this.maxRadius, Math.max(this.minRadius, next));
      }
    });
  }

  update(dt: number): void {
    // Ground-plane forward/right derived from the camera so panning follows view.
    const forward = this.camera.getForwardRay().direction.clone();
    forward.y = 0;
    forward.normalize();
    const right = Vector3.Cross(Vector3.Up(), forward).normalize();

    let x = 0;
    let z = 0;
    const k = this.keys;
    if (k.has("w") || k.has("arrowup")) z += 1;
    if (k.has("s") || k.has("arrowdown")) z -= 1;
    if (k.has("d") || k.has("arrowright")) x += 1;
    if (k.has("a") || k.has("arrowleft")) x -= 1;

    // Screen-edge scrolling (only once the pointer is actually over the canvas).
    if (this.hasPointer) {
      const px = this.scene.pointerX;
      const py = this.scene.pointerY;
      const w = this.canvas.clientWidth;
      const h = this.canvas.clientHeight;
      if (px < this.edgeMargin) x -= 1;
      else if (px > w - this.edgeMargin) x += 1;
      if (py < this.edgeMargin) z += 1;
      else if (py > h - this.edgeMargin) z -= 1;
    }

    if (x === 0 && z === 0) return;

    const move = forward.scale(z).add(right.scale(x));
    if (move.lengthSquared() === 0) return;
    move.normalize().scaleInPlace(this.panSpeed * dt);

    const t = this.camera.target;
    t.x = Math.min(this.bounds, Math.max(-this.bounds, t.x + move.x));
    t.z = Math.min(this.bounds, Math.max(-this.bounds, t.z + move.z));
    this.camera.setTarget(t);
  }
}
