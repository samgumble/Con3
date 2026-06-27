import type { Vector3 } from "@babylonjs/core";

export type BuildResource = "steel" | "concrete" | "glass";

export type ResourceCounts = Record<BuildResource, number>;

/**
 * A structure that supply crews deliver materials into (the HQ Tower). Crews
 * fetch steel/concrete/glass from the depot, carry them here, and install() them.
 */
export interface Supplyable {
  readonly position: Vector3;
  readonly isComplete: boolean;
  /** Units still required for the current phase, per resource. */
  needs(): ResourceCounts;
  /** Install one unit of a resource into the current phase. */
  install(type: BuildResource): void;
}
