export type ResourceType = "funding" | "materials" | "labor";

/** Central store of the player's resources. */
export class Resources {
  funding = 200;
  materials = 0;
  labor = 0;
  laborCap = 5;
  fundingPerSecond = 3; // base income from the Site Office

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
