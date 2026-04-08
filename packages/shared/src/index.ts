// ============================================================
// Server 连接配置
// ============================================================

/** 本地 HTTP server 默认端口（standalone web 模式使用） */
export const SERVER_PORT = 3100;

/** API 路径前缀 */
export const API_PREFIX = "/api";

/** 本地 HTTP server base URL（仅 standalone web 模式有效；Electron 模式走自定义协议/IPC） */
export const SERVER_BASE_URL = `http://localhost:${SERVER_PORT}${API_PREFIX}`;

// ============================================================
// 存储标识
// ============================================================

/** Mastra storage 实例标识符 */
export const STORAGE_ID = "mastra-storage";

// ============================================================
// 应用设置类型（server 与 web 共享）
// ============================================================

export interface BrowserConfig {
  headless: boolean;
  browser: "chrome" | "firefox" | "webkit";
  executablePath?: string;
  userDataDir?: string;
}

export interface AppSettings {
  model: {
    provider: string;
    name: string;
    apiKey: string;
    titleModelName: string;
    thinking: {
      enabled: boolean;
      budgetTokens: number;
      /** "auto": 根据模型名自动判断；否则强制使用指定厂商的 thinking API 格式 */
      providerHint: "auto" | "anthropic" | "google";
    };
  };
  browser: BrowserConfig;
  skills: {
    directory: string;
  };
}
