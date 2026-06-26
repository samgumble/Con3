# Con3 — Construction RTS (Design)

A Warcraft 3-style real-time strategy game with a **construction / site-development**
theme. Instead of armies, you command a **construction crew** that gathers resources
and builds out a full campus/site. **Web-native** (TypeScript + Babylon.js), hosted on
GitHub Pages, with online multiplayer as a later milestone.

## Core loop

> Gather resources → spend them to construct buildings → buildings unlock new
> units/abilities/resources → expand the site → out-develop your opponent.

## Resources (the "construction" economy)

| Resource | Role | Gathered from / produced by |
|---|---|---|
| **Funding ($)** | Primary currency for everything | Office / investors; trickles over time, boosted by buildings |
| **Materials** | Lumber/steel/concrete — consumed by construction | Workers harvest from material yards / quarries |
| **Labor** | Population cap — how many workers/vehicles you can field | Provided by Trailers / Housing |
| **Power** | Gate for advanced buildings | Generators / substations |

Start simple: ship the MVP with **Funding + Materials + Labor**. Add Power later.

## Units

- **Worker (Laborer):** gathers Materials, constructs and repairs buildings.
- **Engineer (T2):** builds advanced structures faster, unlocks upgrades.
- **Vehicles (later):** faster hauling, site clearing.

## Buildings (tech tree sketch)

- **Site Office** (your "town hall") — drop-off for resources, trains Workers, generates Funding.
- **Trailer / Housing** — raises Labor cap.
- **Material Yard** — speeds up Material processing.
- **Workshop (T2)** — trains Engineers, unlocks upgrades.
- **Power Plant (T2)** — provides Power.
- **Showcase / HQ Tower (win condition?)** — expensive capstone build.

## Win condition (pick one for MVP)

1. **Build race:** first to complete the HQ Tower wins. (Simplest, very on-theme.)
2. **Economic dominance:** reach $X total development value.
3. **Last site standing:** combat added later.

MVP target = **#1, single-player vs. a simple AI** (or just a sandbox build race
against the clock), then add online PvP.

## Milestones

- **M0 — Foundation (this repo):** git + LFS + .gitignore + docs. ✅ in progress
- **M1 — Walking worker:** Babylon.js scene, RTS camera (pan/zoom), select a worker, right-click to move.
- **M2 — Gather & drop-off:** worker harvests Materials, returns to Site Office, counts tick up in a HUD.
- **M3 — Build:** spend resources to place + construct a building over time.
- **M4 — Economy loop:** Labor cap, train workers, multiple building types, win condition.
- **M5 — AI opponent:** a basic bot that gathers and builds.
- **M6 — Multiplayer:** authoritative server with command sync, 1v1 online.
- **M7 — Polish & assets:** AI-generated models/textures/SFX, UI pass.

## Tech stack

- **Engine:** [Babylon.js](https://www.babylonjs.com/) (TypeScript), bundled with **Vite**.
- **Pathfinding:** simple grid + A\* for MVP; Babylon's navigation/crowd plugin if unit
  counts get high.
- **Networking (M6):** [Colyseus](https://colyseus.io/) — authoritative game server in
  Node/TypeScript, great for room-based RTS command sync. Runs on a free-tier host
  (Fly.io / Render). WebRTC is an alternative for peer-to-peer.
- **Delivery:** static build deployed to **GitHub Pages**; the Colyseus server (M6+)
  runs on a small free-tier host.

See [docs/AI-ASSETS.md](docs/AI-ASSETS.md) for the AI art/model/audio pipeline.
