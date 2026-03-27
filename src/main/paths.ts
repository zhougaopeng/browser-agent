import { join } from "node:path";
import { app } from "electron";

const USER_DATA = app.getPath("userData");

export const paths = {
  db: join(USER_DATA, "mastra.db"),
  traces: join(USER_DATA, "traces"),
  playwrightProfile: join(USER_DATA, "playwright-profile"),
} as const;
