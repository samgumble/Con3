import { Scene, Vector3 } from "@babylonjs/core";
import type { ShadowGenerator } from "@babylonjs/core";
import { Truck } from "../units/Truck";
import { Resources } from "../game/Resources";
import { BuildResource } from "../buildings/Supplyable";

/**
 * Spawns delivery trucks on an interval, alternating steel and concrete, to keep
 * the depot stocked. Trucks drive in from the east edge, unload, and leave.
 */
export class DeliverySystem {
  private trucks: Truck[] = [];
  private timer = 0;
  private interval = 10; // seconds between deliveries
  private loadPerTruck = 5;
  private next: BuildResource = "concrete"; // Core needs concrete first

  constructor(
    private scene: Scene,
    private depotPos: Vector3,
    private resources: Resources,
    private shadows?: ShadowGenerator
  ) {}

  update(dt: number): void {
    this.timer += dt;
    if (this.timer >= this.interval) {
      this.timer = 0;
      this.spawn();
    }
    for (const t of this.trucks) t.update(dt);
    this.trucks = this.trucks.filter((t) => !t.done);
  }

  private spawn(): void {
    const d = this.depotPos;
    const start = new Vector3(20, 0, d.z + 1);
    const drop = new Vector3(d.x + 5, 0, d.z);
    const exit = new Vector3(20, 0, d.z - 5);
    const cargo = this.next;
    this.next = cargo === "steel" ? "concrete" : "steel";
    this.trucks.push(
      new Truck(this.scene, start, drop, exit, this.resources, cargo, this.loadPerTruck, this.shadows)
    );
  }
}
