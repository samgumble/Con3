import {
  Scene,
  SceneLoader,
  TransformNode,
  Vector3,
} from "@babylonjs/core";
import type { ShadowGenerator } from "@babylonjs/core";
import "@babylonjs/loaders"; // registers glTF / GLB / OBJ / STL importers

export interface LoadModelOptions {
  position?: Vector3;
  scale?: number;
  rotationY?: number;
  shadows?: ShadowGenerator;
}

/**
 * Loads a 3D model from /public/models and returns a TransformNode wrapping it.
 *
 * Format-agnostic: pass "thing.obj", "thing.glb", or "thing.gltf" — Babylon picks
 * the importer by extension. To use a real AI-generated model, export it from
 * Meshy/Tripo/Rodin, drop the file in public/models/, and call this with its name.
 */
export async function loadModel(
  scene: Scene,
  file: string,
  opts: LoadModelOptions = {}
): Promise<TransformNode> {
  const rootUrl = `${import.meta.env.BASE_URL}models/`;
  const result = await SceneLoader.ImportMeshAsync("", rootUrl, file, scene);

  // Wrap all imported meshes under one node so we can transform them together,
  // regardless of how the source format structured its hierarchy.
  const node = new TransformNode(file, scene);
  for (const mesh of result.meshes) {
    if (!mesh.parent) mesh.parent = node;
    if (opts.shadows) opts.shadows.addShadowCaster(mesh);
    // Hand-authored sample has no per-face normals/winding guarantees; show both sides.
    if (mesh.material) mesh.material.backFaceCulling = false;
  }

  node.position = opts.position ?? Vector3.Zero();
  if (opts.scale) node.scaling.setAll(opts.scale);
  if (opts.rotationY) node.rotation.y = opts.rotationY;

  return node;
}
