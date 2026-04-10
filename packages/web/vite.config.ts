import { createHash } from "node:crypto";
import {
  createWriteStream,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import archiver from "archiver";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { uuidv7 } from "uuidv7";
import { type Plugin, defineConfig } from "vite";

function contentHash(distDir: string): string {
  const hash = createHash("sha256");
  const walk = (dir: string) => {
    for (const name of readdirSync(dir).sort()) {
      const full = path.join(dir, name);
      if (statSync(full).isDirectory()) {
        walk(full);
      } else {
        hash.update(path.relative(distDir, full));
        hash.update(readFileSync(full));
      }
    }
  };
  walk(distDir);
  return hash.digest("hex").slice(0, 16);
}

function buildRelease(): Plugin {
  return {
    name: "build-release",
    async writeBundle() {
      const distDir = path.resolve(__dirname, "dist");
      const releaseDir = path.resolve(__dirname, "release");
      const short = contentHash(distDir);
      const version = uuidv7(); // time-ordered, lexicographically comparable
      const zipName = `web-${short}.zip`;
      const versionInfo = { hash: short, zipFileName: zipName, version };

      writeFileSync(path.join(distDir, "version.json"), JSON.stringify(versionInfo, null, 2));

      // 每次构建前清理整个 release 目录，避免旧产物积累
      rmSync(releaseDir, { recursive: true, force: true });
      mkdirSync(releaseDir, { recursive: true });
      writeFileSync(
        path.join(releaseDir, "version.json"),
        JSON.stringify(versionInfo, null, 2),
      );

      const output = createWriteStream(path.join(releaseDir, zipName));
      const archive = archiver("zip", { zlib: { level: 9 } });
      await new Promise<void>((resolve, reject) => {
        output.on("close", resolve);
        archive.on("error", reject);
        archive.pipe(output);
        archive.glob("**/*", { cwd: distDir, dot: true });
        archive.finalize();
      });

      console.log(`\x1b[32m  release/${zipName} (hash: ${short}, version: ${version})\x1b[0m`);
    },
  };
}

export default defineConfig(({ mode }) => ({
  plugins: [
    tailwindcss(),
    react(),
    mode === "zip" && buildRelease(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
  },
}));
