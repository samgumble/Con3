import {
  Engine,
  Scene,
  Color4,
  Vector3,
  HemisphericLight,
  DirectionalLight,
  HighlightLayer,
} from "@babylonjs/core";
import { RtsCamera } from "./systems/RtsCamera";
import { SelectionController } from "./systems/SelectionController";
import { buildEnvironment } from "./environment";
import { Worker } from "./units/Worker";
import { Resources } from "./game/Resources";
import { Hud } from "./ui/Hud";
import { PlacementController } from "./systems/PlacementController";
import { Building } from "./buildings/Building";
import { BUILDING_TYPES } from "./buildings/buildingTypes";

const canvas = document.getElementById("renderCanvas") as HTMLCanvasElement;
const engine = new Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true });

const scene = new Scene(engine);
scene.clearColor = new Color4(0.53, 0.62, 0.72, 1); // sky

const hemi = new HemisphericLight("hemi", new Vector3(0.4, 1, 0.2), scene);
hemi.intensity = 0.8;
const sun = new DirectionalLight("sun", new Vector3(-0.5, -1, -0.3), scene);
sun.intensity = 0.6;

const rts = new RtsCamera(scene, canvas);
const env = buildEnvironment(scene);

const resources = new Resources();

const workers: Worker[] = [];
for (let i = 0; i < 3; i++) {
  workers.push(new Worker(scene, new Vector3(-4 + i * 1.5, 0.7, 4), resources));
}
resources.labor = workers.length;

const highlight = new HighlightLayer("highlight", scene);
const selection = new SelectionController(scene, workers, env, highlight);
const hud = new Hud(resources);

const buildings: Building[] = [];
const placement = new PlacementController(
  scene,
  env.ground,
  resources,
  workers,
  selection,
  (b) => buildings.push(b)
);
selection.placement = placement;

engine.runRenderLoop(() => {
  const dt = engine.getDeltaTime() / 1000;
  resources.add("funding", resources.fundingPerSecond * dt);
  rts.update(dt);
  for (const w of workers) w.update(dt);
  hud.update();
  scene.render();
});

window.addEventListener("resize", () => engine.resize());

// Dev-only debug hook for inspecting/testing behavior from the console.
(window as unknown as { con3: unknown }).con3 = {
  scene,
  camera: rts.camera,
  workers,
  selection,
  resources,
  env,
  buildings,
  moveWorker: (i: number, x: number, z: number) =>
    workers[i]?.moveTo(new Vector3(x, workers[i].mesh.position.y, z)),
  gatherWorker: (i: number) =>
    workers[i]?.assignGather(env.pile.position, env.office.position),
  testBuild: (id: string, x: number, z: number) => {
    const t = BUILDING_TYPES.find((b) => b.id === id);
    if (!t) return "unknown type";
    const b = new Building(scene, t, new Vector3(x, 0, z), resources);
    buildings.push(b);
    workers[0]?.assignBuild(b);
    return `placed ${id}`;
  },
  pos: (i: number) => workers[i]?.mesh.position.asArray(),
};
