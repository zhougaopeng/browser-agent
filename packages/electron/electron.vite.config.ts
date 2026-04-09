import { loadEnv } from "vite";
import { defineConfig } from "electron-vite";

// Resolve NODE_ENV: electron-vite sets it to "development" or "production"
const mode = process.env.NODE_ENV === "production" ? "production" : "development";

// Load .env, .env.local, .env.[mode], .env.[mode].local from packages/electron/
const env = loadEnv(mode, ".", "");

export default defineConfig({
  main: {
    define: {
      // Bake env flags into the main-process bundle at build time.
      // Resolved priority: shell env > .env.local > .env.[mode] > .env
      "process.env.FRONTEND_BUNDLE_URL": JSON.stringify(
        process.env.FRONTEND_BUNDLE_URL ?? env.FRONTEND_BUNDLE_URL ?? "",
      ),
      "process.env.WEB_DEV": JSON.stringify(
        process.env.WEB_DEV ?? env.WEB_DEV ?? "",
      ),
      "process.env.ELECTRON_LOCAL_PACKAGE": JSON.stringify(
        process.env.ELECTRON_LOCAL_PACKAGE ?? env.ELECTRON_LOCAL_PACKAGE ?? "",
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
