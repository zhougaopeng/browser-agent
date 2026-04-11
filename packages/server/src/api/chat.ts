import type { ChatStreamHandlerParams } from "@mastra/ai-sdk";
import { handleChatStream } from "@mastra/ai-sdk";
import { createUIMessageStreamResponse } from "ai";
import { uuidv7 } from "uuidv7";
import { resetLoopState } from "../agent/browser-tools";
import { buildThinkingProviderOptions, detectThinkingSupport } from "../agent/thinking-utils";
import { runWithThread } from "../agent/thread-context";
import { AgentTracer } from "../agent/tracer";
import type { AppInstance } from "../index";

export type { ChatStreamHandlerParams } from "@mastra/ai-sdk";

export interface CreateChatStreamResult {
  stream: Awaited<ReturnType<typeof handleChatStream>>;
  threadId: string;
}

const activeControllers = new Map<string, AbortController>();

export function cancelChat(threadId: string): boolean {
  const controller = activeControllers.get(threadId);
  if (controller) {
    controller.abort();
    activeControllers.delete(threadId);
    return true;
  }
  return false;
}

let tracer: AgentTracer | null = null;

export async function createChatStream(
  app: AppInstance,
  params: ChatStreamHandlerParams & { id?: string },
): Promise<CreateChatStreamResult> {
  const threadId = params.id ?? uuidv7();

  resetLoopState(threadId);
  app.resetToolDisclosure(threadId);

  const catalog = app.skillManager.buildCatalog(await app.skillManager.scanAll());
  const agentInstance = app.mastra.getAgent("browserAgent");
  const instructions = await agentInstance.getInstructions();

  tracer ??= new AgentTracer("browser-agent", app.paths.traces);
  const t = tracer;

  const settings = app.settingsStore.store;
  const { provider, name: modelName, thinking } = settings.model;
  const thinkingEnabled = thinking?.enabled ?? false;
  const budgetTokens = thinking?.budgetTokens ?? 8000;
  const providerHint = thinking?.providerHint ?? "auto";

  const { mode: thinkingMode, label: thinkingLabel } = detectThinkingSupport(provider, modelName);
  const providerOptions = buildThinkingProviderOptions(
    provider,
    modelName,
    budgetTokens,
    providerHint,
  );

  const sendReasoning = thinkingMode === "native" || thinkingEnabled;

  console.log(
    `[chat] thinking mode=${providerHint !== "auto" ? `manual(${providerHint})` : thinkingMode} label="${thinkingLabel}"` +
      ` userEnabled=${thinkingEnabled} sendReasoning=${sendReasoning}` +
      ` budgetTokens=${budgetTokens} providerOptions=${JSON.stringify(providerOptions ?? null)}`,
  );

  const controller = new AbortController();
  activeControllers.set(threadId, controller);

  // Run the entire agent execution within a thread context so that proxy
  // browser tools route to the correct per-thread BrowserSession.
  const stream = await runWithThread(threadId, () =>
    handleChatStream({
      mastra: app.mastra,
      agentId: "browserAgent",
      version: "v6",
      params,
      sendReasoning,
      defaultOptions: {
        maxSteps: 50,
        memory: {
          thread: threadId,
          resource: app.getResourceId(),
        },
        instructions: `${instructions}${catalog}`,
        providerOptions,
        abortSignal: controller.signal,
        onStepFinish: (event: unknown) => {
          t.onStepFinish(event as Parameters<AgentTracer["onStepFinish"]>[0]);
          app.overlayController.handleStep(event);
        },
        onFinish: () => {
          activeControllers.delete(threadId);
          app.overlayController.hide();
        },
      },
    }),
  );

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
