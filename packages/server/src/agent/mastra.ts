import type { Agent } from "@mastra/core/agent";
import { Mastra } from "@mastra/core/mastra";
import { LibSQLStore } from "@mastra/libsql";
import { PinoLogger } from "@mastra/loggers";
import { uuidv7 } from "uuidv7";
import { STORAGE_ID } from "../constants";
import type { AppPaths } from "../paths";

export function createMastra(browserAgent: Agent, titleAgent: Agent, paths: AppPaths): Mastra {
  return new Mastra({
    idGenerator: () => uuidv7(),
    agents: { browserAgent, titleAgent },
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
