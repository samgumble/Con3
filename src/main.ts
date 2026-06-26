import {
  Engine,
  Scene,
  ArcRotateCamera,
  HemisphericLight,
  DirectionalLight,
  Vector3,
  MeshBuilder,
  StandardMaterial,
  Color3,
  Color4,
} from "@babylonjs/core";

const canvas = document.getElementById("renderCanvas") as HTMLCanvasElement;
const engine = new Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true });

function createScene(): Scene {
  const scene = new Scene(engine);
  scene.clearColor = new Color4(0.53, 0.62, 0.72, 1); // sky

  // RTS-style overhead camera (orbit + zoom for now)
  const camera = new ArcRotateCamera(
    "camera",
    -Math.PI / 2,
    Math.PI / 3.2,
    28,
    Vector3.Zero(),
    scene
  );
  camera.attachControl(canvas, true);
  camera.lowerRadiusLimit = 10;
  camera.upperRadiusLimit = 60;
  camera.wheelDeltaPercentage = 0.01;

  const hemi = new HemisphericLight("hemi", new Vector3(0.4, 1, 0.2), scene);
  hemi.intensity = 0.8;
  const sun = new DirectionalLight("sun", new Vector3(-0.5, -1, -0.3), scene);
  sun.intensity = 0.6;

  // Construction site ground (dirt)
  const ground = MeshBuilder.CreateGround("ground", { width: 40, height: 40 }, scene);
  const groundMat = new StandardMaterial("groundMat", scene);
  groundMat.diffuseColor = new Color3(0.45, 0.38, 0.3);
  ground.material = groundMat;

  // Site Office (your "town hall")
  const office = MeshBuilder.CreateBox("siteOffice", { width: 4, depth: 4, height: 3 }, scene);
  office.position.set(0, 1.5, 0);
  const officeMat = new StandardMaterial("officeMat", scene);
  officeMat.diffuseColor = new Color3(0.85, 0.7, 0.2);
  office.material = officeMat;

  // A few workers
  const workerMat = new StandardMaterial("workerMat", scene);
  workerMat.diffuseColor = new Color3(0.2, 0.5, 0.9);
  for (let i = 0; i < 3; i++) {
    const w = MeshBuilder.CreateCapsule(`worker${i}`, { radius: 0.4, height: 1.4 }, scene);
    w.position.set(-4 + i * 1.5, 0.7, 4);
    w.material = workerMat;
  }

  // A pile of materials to harvest
  const pile = MeshBuilder.CreateBox("materials", { size: 1.5 }, scene);
  pile.position.set(10, 0.75, -8);
  const pileMat = new StandardMaterial("pileMat", scene);
  pileMat.diffuseColor = new Color3(0.5, 0.5, 0.5);
  pile.material = pileMat;

  return scene;
}

const scene = createScene();
engine.runRenderLoop(() => scene.render());
window.addEventListener("resize", () => engine.resize());
