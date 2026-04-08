import { homedir } from "node:os";
import { join } from "node:path";
import { SERVER_PORT } from "@browser-agent/shared";

export interface ServerConfig {
  dataDir: string;
  overlayInitScript: string;
  port: number;
}

export function getDefaultConfig(): ServerConfig {
  return {
    dataDir: join(homedir(), ".browser-agent"),
    overlayInitScript: join(import.meta.dirname, "../overlay-init.js"),
    port: SERVER_PORT,
  };
}
