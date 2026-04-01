import type { ChatStreamHandlerParams } from "@mastra/ai-sdk";
import { handleChatStream } from "@mastra/ai-sdk";
import { createUIMessageStreamResponse } from "ai";
import { uuidv7 } from "uuidv7";
import { AgentTracer } from "../agent/tracer";
import type { AppInstance } from "../index";

export type { ChatStreamHandlerParams } from "@mastra/ai-sdk";

export interface CreateChatStreamResult {
  stream: ReturnType<typeof handleChatStream> extends Promise<infer T> ? T : never;
  threadId: string;
}

let tracer: AgentTracer | null = null;

export async function createChatStream(
  app: AppInstance,
  params: ChatStreamHandlerParams & { id?: string },
): Promise<CreateChatStreamResult> {
  const threadId = params.id ?? uuidv7();

  const catalog = app.skillManager.buildCatalog(await app.skillManager.scanAll());
  const agentInstance = app.mastra.getAgent("browserAgent");
  const instructions = await agentInstance.getInstructions();

  tracer ??= new AgentTracer("browser-agent", app.paths.traces);
  const t = tracer;

  const stream = await handleChatStream({
    mastra: app.mastra,
    agentId: "browserAgent",
    version: "v6",
    params,
    defaultOptions: {
      maxSteps: 50,
      memory: {
        thread: threadId,
        resource: app.getResourceId(),
      },
      instructions: `${instructions}${catalog}`,
      onStepFinish: (event: unknown) => {
        t.onStepFinish(event as Parameters<AgentTracer["onStepFinish"]>[0]);
        app.overlayController.handleStep(event);
      },
      onFinish: () => {
        app.overlayController.hide();
      },
    },
  });

  return { stream, threadId };
}

export async function createChatResponse(
  app: AppInstance,
  params: ChatStreamHandlerParams & { id?: string },
): Promise<Response> {
  const { stream, threadId } = await createChatStream(app, params);
  const streamResponse = createUIMessageStreamResponse({ stream });
  const headers = new Headers(streamResponse.headers);
  headers.set("X-Thread-Id", threadId);
  return new Response(streamResponse.body, {
    status: streamResponse.status,
    headers,
  });
}
