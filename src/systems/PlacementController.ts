import {
  Scene,
  AbstractMesh,
  Mesh,
  MeshBuilder,
  StandardMaterial,
  Color3,
  Vector3,
  PointerEventTypes,
} from "@babylonjs/core";
import type { ShadowGenerator } from "@babylonjs/core";
import { sfx } from "../audio/Sfx";
import {
  BUILDING_TYPES,
  BuildingType,
  canAfford,
  spend,
} from "../buildings/buildingTypes";
import { Building } from "../buildings/Building";
import { HqTower } from "../buildings/HqTower";
import { Constructable } from "../buildings/Constructable";
import { Resources } from "../game/Resources";
import { Worker } from "../units/Worker";
import { SelectionController } from "./SelectionController";

/**
 * Owns the build menu and placement mode: pick a building, move a ghost preview
 * over the ground (green = affordable, red = not), left-click to place. Placing
 * spends the cost, spawns a construction site, and dispatches a worker to build.
 */
export class PlacementController {
  private current: BuildingType | null = null;
  private ghost: Mesh | null = null;
  private ghostMat: StandardMaterial;

  constructor(
    private scene: Scene,
    private ground: AbstractMesh,
    private resources: Resources,
    private workers: Worker[],
    private selection: SelectionController,
    private onPlaced: (b: Constructable) => void,
    private shadows?: ShadowGenerator
  ) {
    this.ghostMat = new StandardMaterial("ghostMat", scene);
    this.ghostMat.alpha = 0.5;

    this.buildMenu();

    scene.onPointerObservable.add((pi) => {
      if (pi.type === PointerEventTypes.POINTERMOVE) {
        this.updateGhost();
      } else if (pi.type === PointerEventTypes.POINTERDOWN && this.current) {
        const button = (pi.event as PointerEvent).button;
        if (button === 0) this.tryPlace();
        else this.cancel(); // right-click cancels placement
      }
    });

    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape") this.cancel();
    });
  }

  get isPlacing(): boolean {
    return this.current !== null;
  }

  private buildMenu(): void {
    const menu = document.getElementById("buildmenu");
    if (!menu) return;
    for (const t of BUILDING_TYPES) {
      const btn = document.createElement("button");
      btn.className = "buildbtn";
      const costStr = Object.entries(t.cost)
        .map(([k, v]) => `${v} ${k}`)
        .join(" · ");
      btn.innerHTML = `<b>${t.name}</b><span>${t.blurb}</span><small>${costStr}</small>`;
      btn.onclick = () => this.start(t);
      menu.appendChild(btn);
    }
  }

  private start(t: BuildingType): void {
    this.cancel();
    this.current = t;
    this.ghost = MeshBuilder.CreateBox(
      "ghost",
      { width: t.size.w, depth: t.size.d, height: t.size.h },
      this.scene
    );
    this.ghost.material = this.ghostMat;
    this.ghost.isPickable = false;
    this.updateGhost();
  }

  private updateGhost(): void {
    if (!this.current || !this.ghost) return;
    const pick = this.scene.pick(
      this.scene.pointerX,
      this.scene.pointerY,
      (m) => m === this.ground
    );
    if (pick?.hit && pick.pickedPoint) {
      const p = pick.pickedPoint;
      this.ghost.position.set(p.x, this.current.size.h / 2, p.z);
    }
    const ok = canAfford(this.resources, this.current.cost);
    this.ghostMat.diffuseColor = ok
      ? new Color3(0.3, 0.9, 0.3)
      : new Color3(0.9, 0.3, 0.3);
  }

  private tryPlace(): void {
    if (!this.current || !this.ghost) return;
    if (!canAfford(this.resources, this.current.cost)) {
      sfx.play("deny");
      return; // stay in placement
    }

    const pos = this.ghost.position.clone();
    spend(this.resources, this.current.cost);
    // The HQ Tower builds in phases; everything else is a simple building.
    const building: Constructable =
      this.current.id === "hq"
        ? new HqTower(this.scene, this.current, pos, this.resources, this.shadows)
        : new Building(this.scene, this.current, pos, this.resources, this.shadows);
    this.onPlaced(building);
    sfx.play("place");

    // Dispatch the selected worker, or the nearest one, to build it.
    const builder = this.selection.selected ?? this.nearestWorker(pos);
    builder?.assignBuild(building);

    this.cancel();
  }

  private nearestWorker(p: Vector3): Worker | undefined {
    let best: Worker | undefined;
    let bestD = Infinity;
    for (const w of this.workers) {
      const d = Vector3.DistanceSquared(w.mesh.position, p);
      if (d < bestD) {
        bestD = d;
        best = w;
      }
    }
    return best;
  }

  private cancel(): void {
    this.current = null;
    if (this.ghost) {
      this.ghost.dispose();
      this.ghost = null;
    }
  }
}
