import {
  Scene,
  PointerEventTypes,
  HighlightLayer,
  Color3,
} from "@babylonjs/core";
import { Worker } from "../units/Worker";
import { Environment } from "../environment";
import { Building } from "../buildings/Building";
import { sfx } from "../audio/Sfx";

/**
 * Left-click selects a worker (or deselects on empty ground).
 * Right-click issues a context command for the selected worker:
 *   - on the material pile  -> start the gather loop
 *   - on the ground         -> move there
 */
export class SelectionController {
  selected: Worker | null = null;
  /** Set after construction; clicks are ignored while a building is being placed. */
  placement: { isPlacing: boolean } | null = null;

  constructor(
    private scene: Scene,
    private workers: Worker[],
    private env: Environment,
    private highlight: HighlightLayer
  ) {
    scene
      .getEngine()
      .getRenderingCanvas()
      ?.addEventListener("contextmenu", (e) => e.preventDefault());

    scene.onPointerObservable.add((pi) => {
      if (pi.type !== PointerEventTypes.POINTERDOWN) return;
      if (this.placement?.isPlacing) return; // placement owns the click
      const button = (pi.event as PointerEvent).button;
      if (button === 0) this.handleSelect();
      else if (button === 2) this.handleCommand();
    });
  }

  private handleSelect(): void {
    const pick = this.scene.pick(
      this.scene.pointerX,
      this.scene.pointerY,
      (m) => !!m.metadata?.worker
    );
    const worker = pick?.pickedMesh?.metadata?.worker as Worker | undefined;
    if (worker) this.select(worker);
    else this.deselect();
  }

  private handleCommand(): void {
    if (!this.selected) return;

    // Did we right-click an unfinished building? -> help construct it.
    const buildPick = this.scene.pick(
      this.scene.pointerX,
      this.scene.pointerY,
      (m) => !!m.metadata?.building
    );
    const building = buildPick?.pickedMesh?.metadata?.building as
      | Building
      | undefined;
    if (building && !building.isComplete) {
      this.selected.assignBuild(building);
      return;
    }

    // Did we right-click the material pile? -> gather.
    const nodePick = this.scene.pick(
      this.scene.pointerX,
      this.scene.pointerY,
      (m) => m === this.env.pile
    );
    if (nodePick?.hit) {
      this.selected.assignGather(this.env.pile.position, this.env.office.position);
      return;
    }

    // Otherwise move to the ground point.
    const groundPick = this.scene.pick(
      this.scene.pointerX,
      this.scene.pointerY,
      (m) => m === this.env.ground
    );
    if (groundPick?.hit && groundPick.pickedPoint) {
      this.selected.moveTo(groundPick.pickedPoint);
    }
  }

  select(worker: Worker): void {
    this.deselect();
    this.selected = worker;
    this.highlight.addMesh(worker.mesh, Color3.Green());
    sfx.play("select");
  }

  deselect(): void {
    if (!this.selected) return;
    this.highlight.removeMesh(this.selected.mesh);
    this.selected = null;
  }
}
