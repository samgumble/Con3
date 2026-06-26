import { Color3 } from "@babylonjs/core";
import { Resources } from "../game/Resources";

export type Cost = Partial<Record<"funding" | "materials", number>>;

/** Optional 3D model that replaces the procedural box when a building completes. */
export interface ModelRef {
  file: string; // file in public/models (.glb / .gltf / .obj)
  scale?: number;
  rotationY?: number;
  yOffset?: number;
}

export interface BuildingType {
  id: string;
  name: string;
  blurb: string;
  cost: Cost;
  buildTime: number; // seconds of active construction
  size: { w: number; d: number; h: number };
  color: Color3;
  /** Effect applied once construction completes. */
  apply: (r: Resources) => void;
  /** If true, completing this building wins the game. */
  goal?: boolean;
  /** Optional multi-phase construction (used by the HQ Tower). */
  phases?: { name: string; buildTime: number; materials?: number }[];
  /** Optional finished model; shown in place of the box once built. */
  model?: ModelRef;
}

export const BUILDING_TYPES: BuildingType[] = [
  {
    id: "trailer",
    name: "Trailer",
    blurb: "+5 Labor cap",
    cost: { materials: 40, funding: 50 },
    buildTime: 6,
    size: { w: 3, d: 3, h: 2.4 },
    color: new Color3(0.3, 0.55, 0.85),
    apply: (r) => {
      r.laborCap += 5;
    },
    // To use an AI-generated model, drop a file in public/models/ and uncomment:
    // model: { file: "trailer.glb", scale: 1, yOffset: 0 },
  },
  {
    id: "generator",
    name: "Generator",
    blurb: "+2 Funding/sec",
    cost: { materials: 60, funding: 80 },
    buildTime: 8,
    size: { w: 2.5, d: 2.5, h: 2.8 },
    color: new Color3(0.7, 0.4, 0.2),
    apply: (r) => {
      r.fundingPerSecond += 2;
    },
  },
  {
    id: "hq",
    name: "HQ Tower",
    blurb: "Win — feed it materials",
    cost: { funding: 200 }, // mobilization; materials are consumed per phase
    buildTime: 46,
    size: { w: 5, d: 5, h: 7 },
    color: new Color3(0.9, 0.78, 0.25),
    apply: () => {},
    goal: true,
    phases: [
      { name: "Core", buildTime: 14, materials: 170 },
      { name: "Shell", buildTime: 16, materials: 220 },
      { name: "Fitout", buildTime: 16, materials: 190 },
    ],
  },
];

export function canAfford(r: Resources, cost: Cost): boolean {
  return r.funding >= (cost.funding ?? 0) && r.materials >= (cost.materials ?? 0);
}

export function spend(r: Resources, cost: Cost): void {
  if (cost.funding) r.funding -= cost.funding;
  if (cost.materials) r.materials -= cost.materials;
}
