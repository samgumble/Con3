export type ResourceType = "funding" | "materials" | "labor";

/** Central store of the player's resources. */
export class Resources {
  funding = 150;
  materials = 0;
  labor = 0;
  laborCap = 6;
  fundingPerSecond = 4; // base income from the Site Office

  // Construction supplies stocked at the depot (delivered by trucks).
  steel = 0;
  concrete = 0;
  glass = 0;
  steelCap = 20;
  concreteCap = 20;
  glassCap = 20;

  /** Add a delivered build resource, capped at its storage limit. */
  addBuildResource(type: "steel" | "concrete" | "glass", n: number): void {
    const caps = { steel: this.steelCap, concrete: this.concreteCap, glass: this.glassCap };
    this[type] = Math.min(caps[type], this[type] + n);
  }

  get(type: ResourceType): number {
    return this[type];
  }

  add(type: ResourceType, amount: number): void {
    this[type] += amount;
  }

  /** Spend if affordable; returns whether the spend succeeded. */
  trySpend(type: ResourceType, amount: number): boolean {
    if (this[type] < amount) return false;
    this[type] -= amount;
    return true;
  }
}
