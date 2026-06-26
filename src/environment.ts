import {
  Scene,
  MeshBuilder,
  StandardMaterial,
  Color3,
  Mesh,
  DynamicTexture,
} from "@babylonjs/core";
import type { ShadowGenerator } from "@babylonjs/core";

export interface Environment {
  ground: Mesh;
  office: Mesh;
  pile: Mesh;
}

/** Draw a dirt + survey-grid texture for the construction site ground. */
function makeGroundTexture(scene: Scene): DynamicTexture {
  const size = 1024;
  const tex = new DynamicTexture("groundTex", size, scene, false);
  const ctx = tex.getContext();
  ctx.fillStyle = "#73624a"; // dirt
  ctx.fillRect(0, 0, size, size);
  ctx.strokeStyle = "rgba(255,255,255,0.08)"; // survey grid lines
  ctx.lineWidth = 2;
  const divisions = 20;
  const step = size / divisions;
  for (let i = 0; i <= divisions; i++) {
    ctx.beginPath();
    ctx.moveTo(i * step, 0);
    ctx.lineTo(i * step, size);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i * step);
    ctx.lineTo(size, i * step);
    ctx.stroke();
  }
  tex.update();
  return tex;
}

/** Builds the static construction site: ground, the Site Office, and a material pile. */
export function buildEnvironment(
  scene: Scene,
  shadows?: ShadowGenerator
): Environment {
  // Atmospheric fog for depth.
  scene.fogMode = Scene.FOGMODE_EXP2;
  scene.fogColor = new Color3(0.53, 0.62, 0.72);
  scene.fogDensity = 0.006;

  const ground = MeshBuilder.CreateGround("ground", { width: 40, height: 40 }, scene);
  const groundMat = new StandardMaterial("groundMat", scene);
  groundMat.diffuseTexture = makeGroundTexture(scene);
  groundMat.specularColor = new Color3(0.05, 0.05, 0.05);
  ground.material = groundMat;
  ground.receiveShadows = true;

  // Site Office: base + roof slab + entrance, grouped under one mesh.
  const office = MeshBuilder.CreateBox(
    "siteOffice",
    { width: 4, depth: 4, height: 3 },
    scene
  );
  office.position.set(0, 1.5, 0);
  const officeMat = new StandardMaterial("officeMat", scene);
  officeMat.diffuseColor = new Color3(0.85, 0.7, 0.2);
  office.material = officeMat;

  const roof = MeshBuilder.CreateBox(
    "officeRoof",
    { width: 4.6, depth: 4.6, height: 0.4 },
    scene
  );
  roof.parent = office;
  roof.position.set(0, 1.7, 0);
  const roofMat = new StandardMaterial("roofMat", scene);
  roofMat.diffuseColor = new Color3(0.4, 0.3, 0.15);
  roof.material = roofMat;

  const door = MeshBuilder.CreateBox(
    "officeDoor",
    { width: 1.2, depth: 0.2, height: 1.8 },
    scene
  );
  door.parent = office;
  door.position.set(0, -0.6, 2.0);
  const doorMat = new StandardMaterial("doorMat", scene);
  doorMat.diffuseColor = new Color3(0.2, 0.15, 0.1);
  door.material = doorMat;

  const pile = MeshBuilder.CreateBox("materials", { size: 1.5 }, scene);
  pile.position.set(10, 0.75, -8);
  const pileMat = new StandardMaterial("pileMat", scene);
  pileMat.diffuseColor = new Color3(0.5, 0.5, 0.5);
  pile.material = pileMat;

  if (shadows) {
    shadows.addShadowCaster(office, true); // include roof/door children
    shadows.addShadowCaster(pile);
  }

  return { ground, office, pile };
}
