#!/usr/bin/env tsx

import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { createWriteStream } from "node:fs";
import { pipeline } from "node:stream/promises";
import { join, resolve } from "node:path";
import { execSync } from "node:child_process";
import { parseArgs } from "node:util";

const { values } = parseArgs({
  options: {
    url: { type: "string", short: "u" },
    local: { type: "string", short: "l" },
    output: { type: "string", short: "o", default: "packages/electron/frontend-dist" },
  },
  strict: true,
});

const outputDir = resolve(values.output!);

async function fetchFromUrl(url: string) {
  console.log(`Downloading frontend from ${url}...`);

  const tmpFile = join(outputDir, ".tmp-frontend.tar.gz");
  mkdirSync(outputDir, { recursive: true });

  const response = await fetch(url);
  if (!response.ok || !response.body) {
    throw new Error(`Download failed: ${response.status} ${response.statusText}`);
  }

  const fileStream = createWriteStream(tmpFile);
  // @ts-expect-error ReadableStream to NodeJS stream interop
  await pipeline(response.body, fileStream);

  rmSync(outputDir, { recursive: true, force: true });
  mkdirSync(outputDir, { recursive: true });

  execSync(`tar -xzf "${tmpFile}" -C "${outputDir}"`, { stdio: "inherit" });
  rmSync(tmpFile, { force: true });

  console.log(`Frontend extracted to ${outputDir}`);
}

function copyFromLocal(localPath: string) {
  const srcDir = resolve(localPath);
  if (!existsSync(srcDir)) {
    throw new Error(`Local path does not exist: ${srcDir}`);
  }

  rmSync(outputDir, { recursive: true, force: true });
  mkdirSync(outputDir, { recursive: true });

  cpSync(srcDir, outputDir, { recursive: true });
  console.log(`Frontend copied from ${srcDir} to ${outputDir}`);
}

async function main() {
  if (values.url) {
    await fetchFromUrl(values.url);
  } else if (values.local) {
    copyFromLocal(values.local);
  } else {
    console.error("Usage: fetch-frontend --url <URL> | --local <PATH>");
    console.error("  --url   Download and extract a .tar.gz from a remote URL");
    console.error("  --local Copy frontend build from a local directory");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
