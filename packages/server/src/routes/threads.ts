import type { IncomingMessage, ServerResponse } from "node:http";
import {
  createThread,
  deleteThread,
  getThread,
  listMessages,
  listThreads,
  renameThread,
} from "../api";
import { generateTitle } from "../api/title";
import type { AppInstance } from "../index";

export async function handleThreadsRoute(
  req: IncomingMessage,
  res: ServerResponse,
  app: AppInstance,
): Promise<void> {
  try {
    const url = new URL(req.url ?? "/", `http://${req.headers.host}`);
    const parts = url.pathname.split("/").filter(Boolean);
    const threadId = parts[2];
    const subResource = parts[3];

    if (req.method === "GET" && threadId && subResource === "messages") {
      const rawLimit = url.searchParams.get("limit");
      const limit = rawLimit ? Math.min(Math.max(Math.floor(Number(rawLimit)), 1), 200) : false;
      const cursor = url.searchParams.get("cursor") ?? undefined;
      const result = await listMessages(app, { threadId, limit, cursor });
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
      const rawLimit = url.searchParams.get("limit");
      const limit = rawLimit ? Math.min(Math.max(Math.floor(Number(rawLimit)), 1), 100) : false;
      const page = limit ? Math.max(Math.floor(Number(url.searchParams.get("page")) || 1), 1) : 0;
      const result = await listThreads(app, { limit, page });
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(result));
      return;
    }

    if (req.method === "POST" && threadId === "generate-title") {
      const body = await readBody(req);
      const { messages, threadId: tid } = JSON.parse(body) as {
        messages: { role: string; content: string }[];
        threadId?: string;
      };
      const title = await generateTitle(app, messages, tid);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ title }));
      return;
    }

    if (req.method === "POST" && !threadId) {
      const body = await readBody(req);
      const params = body ? (JSON.parse(body) as { title?: string }) : undefined;
      const result = await createThread(app, params);
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
  } catch (err) {
    console.error("[threads] Route error:", err);
    if (!res.headersSent) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: err instanceof Error ? err.message : "Internal error" }));
    }
  }
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks).toString()));
    req.on("error", reject);
  });
}
