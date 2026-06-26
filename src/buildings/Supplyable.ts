import type { Vector3 } from "@babylonjs/core";

export type BuildResource = "steel" | "concrete";

/**
 * A structure that supply crews deliver materials into (the HQ Tower). Crews
 * fetch steel/concrete from the depot, carry them here, and install() them.
 */
export interface Supplyable {
  readonly position: Vector3;
  readonly isComplete: boolean;
  /** Units still required for the current phase. */
  needs(): { steel: number; concrete: number };
  /** Install one unit of a resource into the current phase. */
  install(type: BuildResource): void;
}
