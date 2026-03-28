import type { Mastra } from "@mastra/core/mastra";
import type Conf from "conf";
import { createBrowserAgent } from "./agent/browser-agent";
import { getMCPClient, initBrowserTools } from "./agent/browser-tools";
import { createMastra } from "./agent/mastra";
import { overlayController } from "./agent/overlay";
import { getDefaultConfig, type ServerConfig } from "./config";
import { type AppPaths, createPaths, getResourceId } from "./paths";
import { skillManager } from "./skills/manager";
import { type AppSettings, createSettingsStore } from "./store/settings";

export interface AppInstance {
  mastra: Mastra;
  settingsStore: Conf<AppSettings>;
  paths: AppPaths;
  skillManager: typeof skillManager;
  overlayController: typeof overlayController;
  getResourceId: () => string;
  cleanup: () => Promise<void>;
}

export async function createApp(config?: Partial<ServerConfig>): Promise<AppInstance> {
  const cfg = { ...getDefaultConfig(), ...config };
  const paths = createPaths(cfg.dataDir);
  const settingsStore = createSettingsStore(cfg.dataDir);

  const skillsDir = settingsStore.get("skills.directory") as string;
  if (skillsDir) skillManager.setDirectory(skillsDir);

  let browserTools = {};
  try {
    browserTools = await initBrowserTools(
      settingsStore.get("browser"),
      cfg.overlayInitScript,
      paths,
    );
  } catch (err) {
    console.error("[server] Failed to init browser tools:", err);
  }

  const agent = createBrowserAgent(browserTools, paths.traces);
  const mastra = createMastra(agent, paths);

  return {
    mastra,
    settingsStore,
    paths,
    skillManager,
    overlayController,
    getResourceId: () => getResourceId(paths),
    cleanup: async () => {
      await getMCPClient()?.disconnect();
    },
  };
}

export type { ServerConfig } from "./config";
export { getDefaultConfig } from "./config";
export type { AppPaths } from "./paths";
export type { AppSettings, BrowserConfig } from "./store/settings";
