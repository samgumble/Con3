import {
  Scene,
  MeshBuilder,
  StandardMaterial,
  Color3,
  Mesh,
} from "@babylonjs/core";

export interface Environment {
  ground: Mesh;
  office: Mesh;
  pile: Mesh;
}

/** Builds the static construction site: ground, the Site Office, and a material pile. */
export function buildEnvironment(scene: Scene): Environment {
  const ground = MeshBuilder.CreateGround("ground", { width: 40, height: 40 }, scene);
  const groundMat = new StandardMaterial("groundMat", scene);
  groundMat.diffuseColor = new Color3(0.45, 0.38, 0.3); // dirt
  ground.material = groundMat;

  const office = MeshBuilder.CreateBox(
    "siteOffice",
    { width: 4, depth: 4, height: 3 },
    scene
  );
  office.position.set(0, 1.5, 0);
  const officeMat = new StandardMaterial("officeMat", scene);
  officeMat.diffuseColor = new Color3(0.85, 0.7, 0.2);
  office.material = officeMat;

  const pile = MeshBuilder.CreateBox("materials", { size: 1.5 }, scene);
  pile.position.set(10, 0.75, -8);
  const pileMat = new StandardMaterial("pileMat", scene);
  pileMat.diffuseColor = new Color3(0.5, 0.5, 0.5);
  pile.material = pileMat;

  return { ground, office, pile };
}
