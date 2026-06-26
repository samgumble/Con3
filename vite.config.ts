import { defineConfig } from "vite";

export default defineConfig({
  server: {
    // Honor the PORT assigned by the launcher; fall back to 5173 for plain `npm run dev`.
    port: process.env.PORT ? Number(process.env.PORT) : 5173,
    host: true,
  },
  // base: "/Con3/" // uncomment when deploying to GitHub Pages under this repo name
});
