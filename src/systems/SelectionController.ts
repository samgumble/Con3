import {
  Scene,
  PointerEventTypes,
  HighlightLayer,
  Color3,
  AbstractMesh,
} from "@babylonjs/core";
import { Worker } from "../units/Worker";

/**
 * Left-click selects a worker (or deselects when clicking empty ground).
 * Right-click commands the selected worker to move to the clicked ground point.
 */
export class SelectionController {
  selected: Worker | null = null;

  constructor(
    private scene: Scene,
    private workers: Worker[],
    private ground: AbstractMesh,
    private highlight: HighlightLayer
  ) {
    // Suppress the browser context menu so right-click is usable as a command.
    scene
      .getEngine()
      .getRenderingCanvas()
      ?.addEventListener("contextmenu", (e) => e.preventDefault());

    scene.onPointerObservable.add((pi) => {
      if (pi.type !== PointerEventTypes.POINTERDOWN) return;
      const button = (pi.event as PointerEvent).button;

      if (button === 0) {
        this.handleSelect();
      } else if (button === 2) {
        this.handleMoveCommand();
      }
    });
  }

  private handleSelect(): void {
    const pick = this.scene.pick(
      this.scene.pointerX,
      this.scene.pointerY,
      (m) => !!m.metadata?.worker
    );
    const worker = pick?.pickedMesh?.metadata?.worker as Worker | undefined;
    if (worker) {
      this.select(worker);
    } else {
      this.deselect();
    }
  }

  private handleMoveCommand(): void {
    if (!this.selected) return;
    const pick = this.scene.pick(
      this.scene.pointerX,
      this.scene.pointerY,
      (m) => m === this.ground
    );
    if (pick?.hit && pick.pickedPoint) {
      this.selected.moveTo(pick.pickedPoint);
    }
  }

  select(worker: Worker): void {
    this.deselect();
    this.selected = worker;
    this.highlight.addMesh(worker.mesh, Color3.Green());
  }

  deselect(): void {
    if (!this.selected) return;
    this.highlight.removeMesh(this.selected.mesh);
    this.selected = null;
  }
}
