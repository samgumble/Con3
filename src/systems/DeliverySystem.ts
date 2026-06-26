import { Scene, Vector3 } from "@babylonjs/core";
import type { ShadowGenerator } from "@babylonjs/core";
import { Depot } from "../buildings/Depot";
import { Truck } from "../units/Truck";

/**
 * Spawns delivery trucks on an interval to keep the depot stocked. Trucks drive
 * in from the east edge, unload, and leave.
 */
export class DeliverySystem {
  private trucks: Truck[] = [];
  private timer = 0;
  private interval = 14; // seconds between deliveries
  private loadPerTruck = 4;

  constructor(
    private scene: Scene,
    private depot: Depot,
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
    const d = this.depot.position;
    const start = new Vector3(20, 0, d.z + 1);
    const drop = new Vector3(d.x + 5, 0, d.z); // pull up alongside the depot
    const exit = new Vector3(20, 0, d.z - 5);
    this.trucks.push(
      new Truck(this.scene, start, drop, exit, this.depot, this.loadPerTruck, this.shadows)
    );
  }
}
