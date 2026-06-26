# Con3 — Construction RTS

### ▶ [Play it now](https://samgumble.github.io/Con3/)

A Warcraft 3-style real-time strategy game with a **construction / site-development**
theme. Gather resources (funding, materials, labor) and build out a full campus/site.
**Web-native** (TypeScript + Babylon.js + Vite) — runs in the browser, hosted on
GitHub Pages, designed for online play.

Pushes to `main` auto-deploy to GitHub Pages via [the Actions workflow](.github/workflows/deploy.yml).

> **Status:** M4 complete — playable single-player build race. Gather materials, train
> workers, construct buildings (Trailer, Generator), and win by building the HQ Tower.
> See [DESIGN.md](DESIGN.md) for the roadmap and [docs/AI-ASSETS.md](docs/AI-ASSETS.md)
> for the AI art/model pipeline.
>
> Next: M5 (AI opponent), M6 (online multiplayer), M7 (AI-generated assets).

## Getting started

Requires [Node.js](https://nodejs.org/) (LTS).

```bash
npm install      # install dependencies
npm run dev      # start the Vite dev server at http://localhost:5173
```

Then open http://localhost:5173. The scene hot-reloads as you edit `src/`.

Other scripts:

```bash
npm run build    # type-check + production build into dist/
npm run preview  # preview the production build locally
```

## Project layout

```
index.html         # canvas + entry
src/main.ts        # Babylon.js scene (camera, lights, site office, workers)
vite.config.ts     # dev server (port 5173) + build config
.claude/launch.json # dev-server config for the Claude launch panel
```

## Tech stack

- **Engine:** [Babylon.js](https://www.babylonjs.com/) (TypeScript)
- **Bundler/dev server:** [Vite](https://vitejs.dev/)
- **Pathfinding:** grid + A\* (MVP)
- **Networking:** [Colyseus](https://colyseus.io/) authoritative server (later milestone)
- **Delivery:** static build on **GitHub Pages**

## Roadmap

See [DESIGN.md](DESIGN.md). Short version: walking worker → gather → build →
economy loop → AI opponent → online 1v1 → polish.
