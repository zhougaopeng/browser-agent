import type { Agent } from "@mastra/core/agent";
import { Mastra } from "@mastra/core/mastra";
import { LibSQLStore } from "@mastra/libsql";
import { PinoLogger } from "@mastra/loggers";
import { STORAGE_ID } from "../constants";
import type { AppPaths } from "../paths";

export function createMastra(browserAgent: Agent, paths: AppPaths): Mastra {
  return new Mastra({
    agents: { browserAgent },
    storage: new LibSQLStore({
      id: STORAGE_ID,
      url: `file:${paths.db}`,
    }),
    logger: new PinoLogger({
      name: "Mastra",
      level: "info",
    }),
  });
}
