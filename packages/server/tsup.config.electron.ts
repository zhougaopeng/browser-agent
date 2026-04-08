import { defineConfig } from "tsup";

// Electron packaging build.
// Identical to the regular build (tsup.config.ts) except that type declaration
// generation is disabled. tsup's DTS worker runs out of memory on large
// dependency graphs (mastra, playwright, etc.) and the declarations are not
// needed at runtime inside the asar archive.
export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  dts: false,
  clean: false, // keep the regular dist/ output (types) untouched
  target: "node22",
  splitting: true,
  tsconfig: "tsconfig.tsup.json",
});
