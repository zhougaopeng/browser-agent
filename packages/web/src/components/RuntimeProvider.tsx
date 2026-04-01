import { useChat } from "@ai-sdk/react";
import {
  AssistantRuntimeProvider,
  useAuiState,
  useRemoteThreadListRuntime,
} from "@assistant-ui/react";
import { useAISDKRuntime } from "@assistant-ui/react-ai-sdk";
import type { ReactNode } from "react";
import { api } from "@/api/adapter";
import { AllBrowserToolUIs } from "@/lib/browser-tool-uis";
import { useServerHistoryAdapter } from "@/lib/history-adapter";
import { threadListAdapter } from "@/lib/thread-adapter";

function useRuntime() {
  const id = useAuiState((s) => s.threadListItem.id);
  const chat = useChat({ id, transport: api.chatTransport });
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
