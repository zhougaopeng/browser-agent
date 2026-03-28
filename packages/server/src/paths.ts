import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export function createPaths(dataDir: string) {
  return {
    db: join(dataDir, "mastra.db"),
    traces: join(dataDir, "traces"),
    playwrightProfile: join(dataDir, "playwright-profile"),
    resourceId: join(dataDir, "resource-id"),
  } as const;
}

export type AppPaths = ReturnType<typeof createPaths>;

let cachedResourceId: string | undefined;

export function getResourceId(paths: AppPaths): string {
  if (cachedResourceId) return cachedResourceId;

  const filePath = paths.resourceId;
  if (existsSync(filePath)) {
    cachedResourceId = readFileSync(filePath, "utf-8").trim();
    if (cachedResourceId) return cachedResourceId;
  }

  cachedResourceId = crypto.randomUUID();
  const dir = join(filePath, "..");
  mkdirSync(dir, { recursive: true });
  writeFileSync(filePath, cachedResourceId, "utf-8");
  return cachedResourceId;
}
