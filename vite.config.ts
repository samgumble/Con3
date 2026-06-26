import { defineConfig } from "vite";

// base must match the repo name for GitHub Pages (served at /Con3/), but stay
// "/" for local dev so the preview works at the root.
export default defineConfig(({ command }) => ({
  base: command === "build" ? "/Con3/" : "/",
  server: {
    // Honor the PORT assigned by the launcher; fall back to 5173 for plain `npm run dev`.
    port: process.env.PORT ? Number(process.env.PORT) : 5173,
    host: true,
  },
}));
