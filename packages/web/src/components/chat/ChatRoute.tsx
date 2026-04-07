import { useAuiState } from "@assistant-ui/react";
import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Thread } from "@/components/assistant-ui/thread";
import { threadSwitchers } from "@/lib/thread-adapter";

/**
 * Wrapper around Thread that syncs the URL's :threadId param to the
 * active runtime thread. This is the single entry point for all
 * thread switching — every path (click, back/forward, refresh,
 * direct URL) funnels through a URL change that lands here.
 */
export function ChatRoute() {
  const { threadId } = useParams<{ threadId?: string }>();
  const remoteId = useAuiState((s) => s.threadListItem.remoteId) as string | undefined;
  const isLoading = useAuiState((s) => s.threads.isLoading);
  const navigate = useNavigate();

  useEffect(() => {
    if (!threadId || threadId === remoteId) return;
    if (isLoading) return;

    const switcher = threadSwitchers.get(threadId);
    if (switcher) {
      switcher();
      return;
    }

    const timer = setInterval(() => {
      const fn = threadSwitchers.get(threadId);
      if (fn) {
        fn();
        clearInterval(timer);
      }
    }, 100);

    const timeout = setTimeout(() => {
      clearInterval(timer);
      navigate("/", { replace: true });
    }, 3000);

    return () => {
      clearInterval(timer);
      clearTimeout(timeout);
    };
  }, [threadId, remoteId, isLoading, navigate]);

  return <Thread />;
}
