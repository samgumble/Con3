# AI Asset Pipeline

Tools for generating game art, models, audio, and how they flow into Unity.

## 3D models (buildings, vehicles, props)

| Tool | Input → Output | Notes |
|---|---|---|
| **Meshy** | text/image → 3D (glTF, FBX, OBJ) | Good quality, PBR textures, retopo option |
| **Tripo3D** | text/image → 3D | Fast, free tier |
| **Luma Genie** | text → 3D | Strong shapes |
| **Rodin (Hyper3D)** | image → 3D | Clean topology |

**Workflow:** generate → export **glTF/FBX** → drag into `Assets/Art/Models/` →
Unity imports automatically (binary files go to Git LFS via `.gitattributes`).
Expect to clean up scale, pivot point, and sometimes topology in Blender.

## 2D art (UI icons, textures, concept art)

- **Midjourney / Leonardo.ai / Scenario** — Scenario is best for a *consistent* game
  art style across many assets (train it on your look, then batch-generate icons/props).
- Export PNG → `Assets/Art/Textures/` or `Assets/UI/`.

## Animation / rigging

- **Mixamo** (free, Adobe): upload a humanoid worker model, auto-rig, grab walk/idle/
  carry/hammer animations as FBX. Works great with Unity's Humanoid rig.

## Audio

- **Suno / Udio** — background music.
- **ElevenLabs** — SFX and unit voice lines ("Yes sir!", "Building complete").
- Export WAV/MP3/OGG → `Assets/Audio/` (LFS).

## Conventions

- Keep generated source files out of `Assets/` if huge; store finals only.
- Name consistently: `bld_site_office`, `unit_worker`, `icon_funding`, etc.
- All binary art is tracked by Git LFS automatically (see `.gitattributes`).
