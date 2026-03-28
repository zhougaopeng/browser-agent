import type { IncomingMessage, ServerResponse } from "node:http";
import type { AppInstance } from "../index";

export async function handleThreadsRoute(
  req: IncomingMessage,
  res: ServerResponse,
  app: AppInstance,
): Promise<void> {
  const url = new URL(req.url ?? "/", `http://${req.headers.host}`);
  const parts = url.pathname.split("/").filter(Boolean);
  const threadId = parts[2];

  if (req.method === "GET" && !threadId) {
    const memoryStore = await app.mastra.getStorage()?.getStore("memory");
    if (!memoryStore) {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ threads: [], hasMore: false }));
      return;
    }
    const limit = Math.min(Math.max(Number(url.searchParams.get("limit")) || 20, 1), 100);
    const page = Math.max(Number(url.searchParams.get("page")) || 1, 1);

    const result = await memoryStore.listThreads({
      filter: { resourceId: app.getResourceId() },
      orderBy: { field: "updatedAt", direction: "DESC" },
      perPage: limit,
      page,
    });

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        threads: result.threads,
        hasMore: result.threads.length === limit,
      }),
    );
    return;
  }

  if (req.method === "DELETE" && threadId) {
    const memoryStore = await app.mastra.getStorage()?.getStore("memory");
    if (memoryStore) await memoryStore.deleteThread({ threadId });
    res.writeHead(204).end();
    return;
  }

  if (req.method === "PATCH" && threadId) {
    const body = await readBody(req);
    const { title } = JSON.parse(body) as { title: string };
    const memoryStore = await app.mastra.getStorage()?.getStore("memory");
    if (memoryStore) {
      await memoryStore.updateThread({ id: threadId, title, metadata: {} });
    }
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
