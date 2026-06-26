# Con3 — Construction RTS

A Warcraft 3-style real-time strategy game with a **construction / site-development**
theme. Gather resources (funding, materials, labor) and build out a full campus/site.
Built in **Unity (3D)**, designed to be hosted on GitHub and played online.

> **Status:** M0 — project foundation. See [DESIGN.md](DESIGN.md) for the full plan
> and [docs/AI-ASSETS.md](docs/AI-ASSETS.md) for the AI art/model pipeline.

## Getting started (one-time setup)

You need Unity before you can open or run the game.

### 1. Install Unity

1. Download **Unity Hub**: https://unity.com/download
2. Open Unity Hub → sign in (free Unity account) → **Installs → Install Editor**.
3. Choose the latest **Unity 6 LTS** (6000.x) release. During install, include the
   **macOS Build Support** module (and **WebGL Build Support** if you want browser demos).
4. The free **Unity Personal** license is fine (no cost under $200K/year revenue).

### 2. Create the Unity project in this folder

> The repo already has git, Git LFS, `.gitignore`, and `.gitattributes` configured.
> When you create the Unity project here, Unity fills in `Assets/`, `ProjectSettings/`,
> and `Packages/` and our git config will track the right files.

1. In Unity Hub → **Projects → New project**.
2. Pick the **3D (URP)** template.
3. Set **Location** to this folder's parent and **Project name** so the path lands at
   `Con3/` *(or create it elsewhere and we'll merge — just tell me which)*.
4. Create. First open takes a few minutes while Unity generates the Library.

### 3. Verify Git LFS

Already initialized for you (`git lfs install` was run). Binary art (`.png`, `.fbx`,
`.wav`, etc.) is tracked via LFS automatically — see `.gitattributes`.

## Tech stack

- **Engine:** Unity 6 LTS — 3D, URP
- **Pathfinding:** Unity NavMesh (MVP)
- **Networking:** [Mirror](https://mirror-networking.com/) (later milestone)
- **Delivery:** native builds via GitHub Releases; optional WebGL demo on GitHub Pages

## Roadmap

See [DESIGN.md](DESIGN.md). Short version: walking worker → gather → build →
economy loop → AI opponent → online 1v1 → polish.
