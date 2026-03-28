import { homedir } from "node:os";
import { join } from "node:path";

export interface ServerConfig {
  dataDir: string;
  overlayInitScript: string;
  port: number;
}

export function getDefaultConfig(): ServerConfig {
  return {
    dataDir: join(homedir(), ".browser-agent"),
    overlayInitScript: join(import.meta.dirname, "../overlay-init.js"),
    port: Number(process.env.PORT) || 3100,
  };
}
