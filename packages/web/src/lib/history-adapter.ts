import type { ThreadHistoryAdapter } from "@assistant-ui/react";
import { useAui } from "@assistant-ui/react";
import type { UIMessage } from "ai";
import { useState } from "react";
import { api } from "../api/adapter";

interface ServerMessagePart {
  type: string;
  text?: string;
  toolCallId?: string;
  toolName?: string;
  args?: Record<string, unknown>;
  argsText?: string;
  result?: unknown;
  isError?: boolean;
  [key: string]: unknown;
}

interface ServerMessageContent {
  format: number;
  parts: ServerMessagePart[];
  metadata?: Record<string, unknown>;
}

interface ServerMessage {
  id: string;
  role: "user" | "assistant" | "system";
  createdAt: string;
  content: ServerMessageContent | string;
}

type UIMessagePart =
  | { type: "text"; text: string }
  | { type: "reasoning"; text: string }
  | {
      type: string;
      toolName: string;
      toolCallId: string;
      state: string;
      input: unknown;
      output?: unknown;
      errorText?: string;
    }
  | { type: "step-start" };

function convertToUIMessage(msg: ServerMessage): UIMessage {
  let parts: UIMessagePart[];

  if (typeof msg.content === "string") {
    parts = msg.content ? [{ type: "text", text: msg.content }] : [{ type: "text", text: "" }];
  } else if (msg.content?.parts) {
    parts = convertPartsToUI(msg.content.parts);
  } else {
    parts = [{ type: "text", text: "" }];
  }

  if (parts.length === 0) {
    parts = [{ type: "text", text: "" }];
  }

  return {
    id: msg.id,
    role: msg.role,
    parts,
  } as UIMessage;
}

function convertPartsToUI(parts: ServerMessagePart[]): UIMessagePart[] {
  const toolResults = new Map<string, { result: unknown; isError?: boolean }>();
  for (const p of parts) {
    if (p.type === "tool-result" && p.toolCallId) {
      toolResults.set(p.toolCallId, {
        result: p.result,
        isError: p.isError,
      });
    }
  }

  const converted: UIMessagePart[] = [];
  for (const p of parts) {
    switch (p.type) {
      case "text":
        if (p.text) converted.push({ type: "text", text: p.text });
        break;
      case "reasoning":
        if (p.text) converted.push({ type: "reasoning", text: p.text });
        break;
      case "tool-call": {
        const merged = toolResults.get(p.toolCallId ?? "");
        const hasResult = merged !== undefined;
        const toolName = p.toolName ?? "";
        converted.push({
          type: `tool-${toolName}`,
          toolName,
          toolCallId: p.toolCallId ?? "",
          state: hasResult ? (merged?.isError ? "output-error" : "output-available") : "call",
          input: p.args ?? {},
          ...(hasResult && !merged?.isError ? { output: merged?.result } : {}),
          ...(hasResult && merged?.isError ? { errorText: String(merged?.result ?? "Error") } : {}),
        });
        break;
      }
      case "step-start":
        converted.push({ type: "step-start" });
        break;
      case "tool-result":
        break;
      default:
        if (p.text) converted.push({ type: "text", text: p.text });
        break;
    }
  }

  return converted;
}

class ServerHistoryAdapter {
  private aui: ReturnType<typeof useAui>;

  constructor(aui: ReturnType<typeof useAui>) {
    this.aui = aui;
  }

  withFormat(_formatAdapter: unknown) {
    const adapter = this;
    return {
      async load() {
        const remoteId = adapter.aui.threadListItem().getState().remoteId;
        if (!remoteId) return { messages: [] };

        try {
          const data = await api.threads.messages(remoteId, { limit: 200 });
          const serverMsgs = (data.messages ?? []) as unknown as ServerMessage[];
          if (serverMsgs.length === 0) return { messages: [] };

          let prevId: string | null = null;
          const messages = serverMsgs.map((msg) => {
            const item = {
              parentId: prevId,
              message: convertToUIMessage(msg),
            };
            prevId = msg.id;
            return item;
          });

          return {
            headId: prevId,
            messages,
          };
        } catch {
          return { messages: [] };
        }
      },

      async append(): Promise<void> {},
    };
  }
}

export function useServerHistoryAdapter(): ThreadHistoryAdapter {
  const aui = useAui();
  const [adapter] = useState(
    () => new ServerHistoryAdapter(aui) as unknown as ThreadHistoryAdapter,
  );
  return adapter;
}
