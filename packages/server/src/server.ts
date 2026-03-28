import { createServer } from "node:http";
import { createApp } from "./index";
import { handleChatRoute } from "./routes/chat";
import { handleSettingsRoute } from "./routes/settings";
import { handleThreadsRoute } from "./routes/threads";

const PORT = Number(process.env.PORT) || 3100;

async function main() {
  const app = await createApp({
    dataDir: process.env.DATA_DIR || undefined,
  });
  console.log("[server] Mastra agent initialized");

  const server = createServer(async (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
      res.writeHead(204).end();
      return;
    }

    try {
      const url = new URL(req.url ?? "/", `http://localhost:${PORT}`);

      if (url.pathname === "/api/chat") return handleChatRoute(req, res, app);
      if (url.pathname.startsWith("/api/settings")) return handleSettingsRoute(req, res, app);
      if (url.pathname.startsWith("/api/threads")) return handleThreadsRoute(req, res, app);

      res.writeHead(404).end("Not Found");
    } catch (err) {
      console.error("[server] Request error:", err);
      if (!res.headersSent) {
        res.writeHead(500).end("Internal Server Error");
      }
    }
  });

  server.listen(PORT, () => {
    console.log(`[server] HTTP API on http://localhost:${PORT}`);
  });

  process.on("SIGINT", async () => {
    await app.cleanup();
    process.exit(0);
  });
}

main().catch(console.error);
