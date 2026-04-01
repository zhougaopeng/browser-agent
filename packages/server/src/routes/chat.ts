import type { IncomingMessage, ServerResponse } from "node:http";
import type { ChatStreamHandlerParams } from "@mastra/ai-sdk";
import { createUIMessageStreamResponse } from "ai";
import { createChatStream } from "../api";
import type { AppInstance } from "../index";

export async function handleChatRoute(
  req: IncomingMessage,
  res: ServerResponse,
  app: AppInstance,
): Promise<void> {
  if (req.method !== "POST") {
    res.writeHead(405).end("Method Not Allowed");
    return;
  }

  const body = await readBody(req);
  const params = JSON.parse(body) as ChatStreamHandlerParams & { id?: string };
  const { stream, threadId } = await createChatStream(app, params);

  const streamResponse = createUIMessageStreamResponse({ stream });

  res.writeHead(streamResponse.status, {
    "Content-Type": streamResponse.headers.get("Content-Type") ?? "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "X-Thread-Id": threadId,
  });

  if (streamResponse.body) {
    const reader = streamResponse.body.getReader();
    const pump = async () => {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(value);
      }
      res.end();
    };
    pump().catch(() => res.end());
  } else {
    res.end();
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
