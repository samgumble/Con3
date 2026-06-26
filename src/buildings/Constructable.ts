import type { Vector3 } from "@babylonjs/core";
import type { BuildingType } from "./buildingTypes";

/**
 * Anything a worker can construct. Implemented by both the generic Building and
 * the multi-phase HqTower so the build system can treat them uniformly.
 */
export interface Constructable {
  readonly type: BuildingType;
  readonly position: Vector3;
  readonly isComplete: boolean;
  /** Advance construction by dt seconds (called by the assigned worker). */
  advance(dt: number): void;
}
