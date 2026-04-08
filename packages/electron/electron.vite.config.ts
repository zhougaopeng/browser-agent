import { loadEnv } from "vite";
import { defineConfig } from "electron-vite";

// Resolve NODE_ENV: electron-vite sets it to "development" or "production"
const mode = process.env.NODE_ENV === "production" ? "production" : "development";

// Load .env, .env.local, .env.[mode], .env.[mode].local from repo root
// (three levels up from packages/electron)
const env = loadEnv(mode, "../..", "");

export default defineConfig({
  main: {
    define: {
      // Bake the CDN base URL into the main-process bundle at build time.
      // Resolved priority: shell env > .env.local > .env.[mode] > .env
      "process.env.FRONTEND_BUNDLE_URL": JSON.stringify(
        process.env.FRONTEND_BUNDLE_URL ?? env.FRONTEND_BUNDLE_URL ?? "",
      ),
    },
  },
  preload: {
    build: {
      rollupOptions: {
        output: {
          format: "cjs",
          entryFileNames: "[name].cjs",
        },
      },
    },
  },
  renderer: {},
});
