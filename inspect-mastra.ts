import { createApp } from "./packages/server/src/index";

async function test() {
  const app = await createApp();
  const mastra = app.mastra;
  console.log("Mastra storage:", !!mastra.getStorage());
  const memoryStore = await mastra.getStorage()?.getStore("memory");
  console.log("Memory store detected:", !!memoryStore);
  if (memoryStore) {
    const keys = Object.keys(memoryStore);
    console.log("Memory store keys:", keys);
    const result = await (memoryStore as any).listThreads({
       filter: { resourceId: app.getResourceId() }
    });
    console.log("Threads count:", result.threads.length);
  }
  process.exit(0);
}

test().catch(console.error);
