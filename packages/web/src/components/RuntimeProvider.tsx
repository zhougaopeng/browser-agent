import { useChat } from "@ai-sdk/react";
import {
  AssistantRuntimeProvider,
  useAuiState,
  useRemoteThreadListRuntime,
} from "@assistant-ui/react";
import { useAISDKRuntime } from "@assistant-ui/react-ai-sdk";
import { type ReactNode, useMemo } from "react";
import { uuidv7 } from "uuidv7";
import { api } from "@/api/adapter";
import { AllBrowserToolUIs } from "@/lib/browser-tool-uis";
import { useServerHistoryAdapter } from "@/lib/history-adapter";
import { createThreadListAdapter } from "@/lib/thread-adapter";

function useRuntime() {
  const id = useAuiState((s) => s.threadListItem.id);
  const chat = useChat({ id, transport: api.chatTransport, generateId: () => uuidv7() });
  const history = useServerHistoryAdapter();
  return useAISDKRuntime(chat, { adapters: { history } });
}

export function RuntimeProvider({ children }: { children: ReactNode }) {
  const adapter = useMemo(() => createThreadListAdapter(), []);

  const runtime = useRemoteThreadListRuntime({
    runtimeHook: useRuntime,
    adapter,
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      {AllBrowserToolUIs.map((ToolUI) => (
        <ToolUI key={ToolUI.unstable_tool.toolName} />
      ))}
      {children}
    </AssistantRuntimeProvider>
  );
}
