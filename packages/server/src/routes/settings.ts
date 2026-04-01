import type { IncomingMessage, ServerResponse } from "node:http";
import { getSettings, updateSetting } from "../api";
import type { AppInstance } from "../index";

export async function handleSettingsRoute(
  req: IncomingMessage,
  res: ServerResponse,
  app: AppInstance,
): Promise<void> {
  if (req.method === "GET") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(getSettings(app)));
    return;
  }

  if (req.method === "POST") {
    const body = await readBody(req);
    const { key, value } = JSON.parse(body) as { key: string; value: unknown };
    const store = await updateSetting(app, key, value);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(store));
    return;
  }

  res.writeHead(405).end("Method Not Allowed");
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks).toString()));
    req.on("error", reject);
  });
}
