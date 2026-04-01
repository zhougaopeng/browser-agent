import { useChat } from "@ai-sdk/react";
import {
  AssistantRuntimeProvider,
  useAuiState,
  useRemoteThreadListRuntime,
} from "@assistant-ui/react";
import { AssistantChatTransport, useAISDKRuntime } from "@assistant-ui/react-ai-sdk";
import type { ReactNode } from "react";
import { AllBrowserToolUIs } from "@/lib/browser-tool-uis";
import { useServerHistoryAdapter } from "@/lib/history-adapter";
import { threadListAdapter } from "@/lib/thread-adapter";

const transport = new AssistantChatTransport({
  api: "http://localhost:3100/api/chat",
});

function useRuntime() {
  const id = useAuiState((s) => s.threadListItem.id);
  const chat = useChat({ id, transport });
  const history = useServerHistoryAdapter();
  return useAISDKRuntime(chat, { adapters: { history } });
}

export function RuntimeProvider({ children }: { children: ReactNode }) {
  const runtime = useRemoteThreadListRuntime({
    runtimeHook: useRuntime,
    adapter: threadListAdapter,
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
