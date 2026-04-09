import type { Mastra } from "@mastra/core/mastra";
import type Conf from "conf";
import { createBrowserAgent } from "./agent/browser-agent";
import { getBrowserTools, getMCPClient, initBrowserTools } from "./agent/browser-tools";
import { createMastra } from "./agent/mastra";
import { overlayController } from "./agent/overlay";
import { createTitleAgent } from "./agent/title-agent";
import { getDefaultConfig, type ServerConfig } from "./config";
import { type AppPaths, createPaths, getResourceId } from "./paths";
import { skillManager } from "./skills/manager";
import { type AppSettings, createSettingsStore } from "./store/settings";

const ENV_KEY_OVERRIDES: Record<string, string> = {
  alibaba: "DASHSCOPE_API_KEY",
  google: "GOOGLE_GENERATIVE_AI_API_KEY",
  moonshotai: "MOONSHOT_API_KEY",
  zhipuai: "ZHIPU_API_KEY",
};

function resolveEnvKey(provider: string): string {
  return ENV_KEY_OVERRIDES[provider] ?? `${provider.toUpperCase()}_API_KEY`;
}

export interface AppInstance {
  readonly mastra: Mastra;
  readonly settingsStore: Conf<AppSettings>;
  readonly paths: AppPaths;
  readonly skillManager: typeof skillManager;
  readonly overlayController: typeof overlayController;
  getResourceId: () => string;
  cleanup: () => Promise<void>;
  rebuild: () => Promise<void>;
}

export async function createApp(config?: Partial<ServerConfig>): Promise<AppInstance> {
  const cfg = { ...getDefaultConfig(), ...config };
  const paths = createPaths(cfg.dataDir);
  console.log("[server] Paths created:", paths);
  const settingsStore = createSettingsStore(cfg.dataDir);

  let currentMastra!: Mastra;
  let lastBrowserConfigJSON = "";

  async function rebuild() {
    const settings = settingsStore.store;

    if (settings.model.apiKey) {
      const envKey = resolveEnvKey(settings.model.provider);
      process.env[envKey] = settings.model.apiKey;
    }

    if (settings.skills.directory) {
      skillManager.setDirectory(settings.skills.directory);
    }

    const browserJSON = JSON.stringify(settings.browser);
    if (browserJSON !== lastBrowserConfigJSON) {
      try {
        await initBrowserTools(settings.browser, cfg.overlayInitScript, paths);
        lastBrowserConfigJSON = browserJSON;
        console.log("[server] Browser tools reinitialized");
      } catch (err) {
        console.error("[server] Failed to reinit browser tools:", err);
      }
    }

    const modelId = `${settings.model.provider}/${settings.model.name}`;
    const titleModelId = settings.model.titleModelName
      ? `${settings.model.provider}/${settings.model.titleModelName}`
      : modelId;
    const agent = createBrowserAgent(getBrowserTools(), modelId);
    const titleAgent = createTitleAgent(titleModelId);
    currentMastra = createMastra(agent, titleAgent, paths);
    console.log(`[server] Agent rebuilt with model: ${modelId}, titleModel: ${titleModelId}`);
  }

  await rebuild();

  const app: AppInstance = {
    get mastra() {
      return currentMastra;
    },
    settingsStore,
    paths,
    skillManager,
    overlayController,
    getResourceId: () => getResourceId(paths),
    cleanup: async () => {
      await getMCPClient()?.disconnect();
    },
    rebuild,
  };

  return app;
}

export {
  type ChatStreamHandlerParams,
  type CreateChatStreamResult,
  cancelChat,
  createChatResponse,
  createChatStream,
  createThread,
  deleteThread,
  generateTitle,
  getSettings,
  getThread,
  type ListMessagesParams,
  type ListThreadsParams,
  listMessages,
  listThreads,
  renameThread,
  updateSetting,
} from "./api";
export type { ServerConfig } from "./config";
export { getDefaultConfig } from "./config";
export type { AppPaths } from "./paths";
export type { AppSettings, BrowserConfig } from "./store/settings";
