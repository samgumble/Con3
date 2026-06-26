import {
  Engine,
  Scene,
  Color4,
  Color3,
  Vector3,
  HemisphericLight,
  DirectionalLight,
  HighlightLayer,
  ShadowGenerator,
} from "@babylonjs/core";
import { sfx } from "./audio/Sfx";
import { loadModel } from "./assets/loadModel";
import { RtsCamera } from "./systems/RtsCamera";
import { SelectionController } from "./systems/SelectionController";
import { buildEnvironment } from "./environment";
import { Worker } from "./units/Worker";
import { Resources } from "./game/Resources";
import { Hud } from "./ui/Hud";
import { PlacementController } from "./systems/PlacementController";
import { TrainingController } from "./systems/TrainingController";
import { Building } from "./buildings/Building";
import { BUILDING_TYPES } from "./buildings/buildingTypes";

const canvas = document.getElementById("renderCanvas") as HTMLCanvasElement;
const engine = new Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true });

const scene = new Scene(engine);
scene.clearColor = new Color4(0.53, 0.62, 0.72, 1); // sky

const hemi = new HemisphericLight("hemi", new Vector3(0.4, 1, 0.2), scene);
hemi.intensity = 0.55;
hemi.groundColor = new Color3(0.3, 0.25, 0.2);
const sun = new DirectionalLight("sun", new Vector3(-0.5, -1, -0.3), scene);
sun.position = new Vector3(25, 45, 15);
sun.intensity = 1.0;

const shadows = new ShadowGenerator(1024, sun);
shadows.useBlurExponentialShadowMap = true;
shadows.blurKernel = 16;
shadows.bias = 0.01; // reduce shadow acne
shadows.normalBias = 0.02;

const rts = new RtsCamera(scene, canvas);
const env = buildEnvironment(scene, shadows);

const resources = new Resources();

const workers: Worker[] = [];
for (let i = 0; i < 3; i++) {
  workers.push(
    new Worker(scene, new Vector3(-4 + i * 1.5, 0.7, 4), resources, shadows)
  );
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
  (b) => buildings.push(b),
  shadows
);
selection.placement = placement;

const training = new TrainingController(
  scene,
  resources,
  workers,
  new Vector3(3, 0.7, 5), // spawn point in front of the Site Office
  shadows
);

// Demo of the model-loading pipeline: place a loaded model on the site.
// Swap "sample_depot.obj" for a real AI-generated .glb to use it instead.
loadModel(scene, "sample_depot.obj", {
  position: new Vector3(-12, 0, -7),
  scale: 1.6,
  shadows,
}).catch((e) => console.error("model load failed:", e));

// Start screen: the Play button is the user gesture that unlocks audio.
const startBtn = document.getElementById("startbtn");
startBtn?.addEventListener("click", () => {
  sfx.unlock();
  const screen = document.getElementById("startscreen");
  if (screen) screen.style.display = "none";
});

let won = false;
function checkWin(): void {
  if (won) return;
  if (buildings.some((b) => b.isComplete && b.type.goal)) {
    won = true;
    const v = document.getElementById("victory");
    if (v) v.style.display = "flex";
  }
}

engine.runRenderLoop(() => {
  const dt = engine.getDeltaTime() / 1000;
  resources.add("funding", resources.fundingPerSecond * dt);
  rts.update(dt);
  for (const w of workers) w.update(dt);
  training.update(dt);
  hud.update();
  checkWin();
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
  training,
  checkWin,
  isWon: () => won,
  moveWorker: (i: number, x: number, z: number) =>
    workers[i]?.moveTo(new Vector3(x, workers[i].mesh.position.y, z)),
  gatherWorker: (i: number) =>
    workers[i]?.assignGather(env.pile.position, env.office.position),
  testBuild: (id: string, x: number, z: number) => {
    const t = BUILDING_TYPES.find((b) => b.id === id);
    if (!t) return "unknown type";
    const b = new Building(scene, t, new Vector3(x, 0, z), resources, shadows);
    buildings.push(b);
    workers[0]?.assignBuild(b);
    return `placed ${id}`;
  },
  pos: (i: number) => workers[i]?.mesh.position.asArray(),
};
