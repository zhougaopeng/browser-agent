import { createServer } from "node:http";
import { SERVER_PORT } from "@browser-agent/shared";
import { createApp } from "./index";
import { handleChatCancelRoute, handleChatRoute } from "./routes/chat";
import { handleSettingsRoute } from "./routes/settings";
import { handleThreadsRoute } from "./routes/threads";

const PORT = SERVER_PORT;

async function main() {
  console.log("[server] Starting Mastra agent... DATA_DIR: ", process.env.DATA_DIR);
  const app = await createApp(process.env.DATA_DIR ? { dataDir: process.env.DATA_DIR } : {});
  console.log("[server] Mastra agent initialized");

  const server = createServer(async (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.setHeader("Access-Control-Expose-Headers", "X-Thread-Id");

    if (req.method === "OPTIONS") {
      res.writeHead(204).end();
      return;
    }

    try {
      const url = new URL(req.url ?? "/", `http://localhost:${PORT}`);

      if (url.pathname === "/health") {
        res.writeHead(200).end("ok");
        return;
      }
      if (url.pathname === "/api/chat") return await handleChatRoute(req, res, app);
      if (url.pathname === "/api/chat/cancel") return await handleChatCancelRoute(req, res);
      if (url.pathname.startsWith("/api/settings")) return await handleSettingsRoute(req, res, app);
      if (url.pathname.startsWith("/api/threads")) return await handleThreadsRoute(req, res, app);

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

process.on("unhandledRejection", (reason) => {
  console.error("[server] Unhandled promise rejection (process kept alive):", reason);
});

main().catch(console.error);
