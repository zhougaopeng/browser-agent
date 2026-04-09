import { useChat } from "@ai-sdk/react";
import type { AssistantRuntime } from "@assistant-ui/react";
import {
  AssistantRuntimeProvider,
  useAuiState,
  useRemoteThreadListRuntime,
} from "@assistant-ui/react";
import { useAISDKRuntime } from "@assistant-ui/react-ai-sdk";
import { type ReactNode, useEffect, useMemo, useRef } from "react";
import { uuidv7 } from "uuidv7";
import { api } from "@/api/adapter";
import { AllBrowserToolUIs } from "@/lib/browser-tool-uis";
import { useServerHistoryAdapter } from "@/lib/history-adapter";
import { createThreadListAdapter } from "@/lib/thread-adapter";

interface ThreadListCoreState {
  threadIds: string[];
  [key: string]: unknown;
}

interface ThreadListCoreAccess {
  _state: {
    baseValue: ThreadListCoreState;
    update: (state: ThreadListCoreState) => void;
  };
  getItemById: (id: string) => { remoteId?: string } | undefined;
}

let threadListCoreRef: ThreadListCoreAccess | null = null;

function moveThreadToTop(threadId: string) {
  const core = threadListCoreRef;
  if (!core) return;

  const data = core.getItemById(threadId);
  if (!data?.remoteId) return;

  const state = core._state.baseValue;
  const idx = state.threadIds.indexOf(data.remoteId);
  if (idx <= 0) return;

  const reordered = [...state.threadIds];
  reordered.splice(idx, 1);
  reordered.unshift(data.remoteId);

  core._state.update({ ...state, threadIds: reordered });
}

function useRuntime() {
  const id = useAuiState((s) => s.threadListItem.id);
  const idRef = useRef(id);
  idRef.current = id;

  const chat = useChat({
    id,
    transport: api.chatTransport,
    generateId: () => uuidv7(),
    onFinish: () => {
      moveThreadToTop(idRef.current);
    },
  });
  const history = useServerHistoryAdapter();
  return useAISDKRuntime(chat, { adapters: { history } });
}

function extractThreadListCore(runtime: AssistantRuntime): ThreadListCoreAccess | null {
  try {
    const core = (runtime.threads as unknown as { _core: ThreadListCoreAccess })._core;
    if (core?._state?.baseValue && typeof core.getItemById === "function") {
      return core;
    }
  } catch {
    // runtime internals changed; degrade gracefully
  }
  return null;
}

export function RuntimeProvider({ children }: { children: ReactNode }) {
  const adapter = useMemo(() => createThreadListAdapter(), []);

  const runtime = useRemoteThreadListRuntime({
    runtimeHook: useRuntime,
    adapter,
  });

  useEffect(() => {
    threadListCoreRef = extractThreadListCore(runtime);
    return () => {
      threadListCoreRef = null;
    };
  }, [runtime]);

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      {AllBrowserToolUIs.map((ToolUI) => (
        <ToolUI key={ToolUI.unstable_tool.toolName} />
      ))}
      {children}
    </AssistantRuntimeProvider>
  );
}
