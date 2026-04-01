import type { IncomingMessage, ServerResponse } from "node:http";
import {
  createThread,
  deleteThread,
  getThread,
  listMessages,
  listThreads,
  renameThread,
} from "../api";
import type { AppInstance } from "../index";

export async function handleThreadsRoute(
  req: IncomingMessage,
  res: ServerResponse,
  app: AppInstance,
): Promise<void> {
  const url = new URL(req.url ?? "/", `http://${req.headers.host}`);
  const parts = url.pathname.split("/").filter(Boolean);
  const threadId = parts[2];
  const subResource = parts[3];

  if (req.method === "GET" && threadId && subResource === "messages") {
    const limit = Math.min(Math.max(Number(url.searchParams.get("limit")) || 40, 1), 200);
    const page = Math.max(Number(url.searchParams.get("page")) || 0, 0);
    const result = await listMessages(app, { threadId, limit, page });
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(result));
    return;
  }

  if (req.method === "GET" && threadId && !subResource) {
    const thread = await getThread(app, threadId);
    if (!thread) {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Thread not found" }));
      return;
    }
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(thread));
    return;
  }

  if (req.method === "GET" && !threadId) {
    const limit = Math.min(Math.max(Number(url.searchParams.get("limit")) || 20, 1), 100);
    const page = Math.max(Number(url.searchParams.get("page")) || 1, 1);
    const result = await listThreads(app, { limit, page });
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(result));
    return;
  }

  if (req.method === "POST" && !threadId) {
    const result = await createThread(app);
    res.writeHead(201, { "Content-Type": "application/json" });
    res.end(JSON.stringify(result));
    return;
  }

  if (req.method === "DELETE" && threadId) {
    await deleteThread(app, threadId);
    res.writeHead(204).end();
    return;
  }

  if (req.method === "PATCH" && threadId) {
    const body = await readBody(req);
    const { title } = JSON.parse(body) as { title: string };
    await renameThread(app, threadId, title);
    res.writeHead(204).end();
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
