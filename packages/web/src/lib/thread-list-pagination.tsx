import { useAssistantRuntime } from "@assistant-ui/react";
import { createContext, type ReactNode, useCallback, useContext, useRef, useState } from "react";
import { PAGE_SIZE, type ThreadListPaginationRefs } from "./thread-adapter";

interface ThreadListPaginationContextValue {
  loadMore: () => Promise<void>;
  hasMore: boolean;
  isLoadingMore: boolean;
}

const ThreadListPaginationContext = createContext<ThreadListPaginationContextValue>({
  loadMore: async () => {},
  hasMore: true,
  isLoadingMore: false,
});

export const useThreadListPagination = () => useContext(ThreadListPaginationContext);

/**
 * Wires infinite-load pagination into the AssistantUI runtime.
 *
 * AUI caches the result of `adapter.list()` in a private `_loadThreadsPromise`.
 * The only way to append more threads is to bump the limit, reset the cached
 * promise, and await a fresh load. This couples to AUI internals — replace with
 * the official pagination API once assistant-ui/assistant-ui#3621 lands.
 */
export function ThreadListPaginationProvider({
  paginationRefs,
  children,
}: {
  paginationRefs: ThreadListPaginationRefs;
  children: ReactNode;
}) {
  const runtime = useAssistantRuntime();
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const lockRef = useRef(false);

  const { limitRef, hasMoreRef } = paginationRefs;

  const loadMore = useCallback(async () => {
    if (lockRef.current || !hasMoreRef.current) return;
    lockRef.current = true;
    setIsLoadingMore(true);

    try {
      limitRef.current += PAGE_SIZE;

      // Reset the cached promise to force adapter.list() to be called again.
      // This accesses private AUI internals — tracked by upstream #3621.
      const core = (runtime as unknown as { _core: unknown })._core as {
        threads: {
          _loadThreadsPromise: Promise<void> | undefined;
          getLoadThreadsPromise: () => Promise<void>;
        };
      };
      core.threads._loadThreadsPromise = undefined;
      await core.threads.getLoadThreadsPromise();

      setHasMore(hasMoreRef.current);
    } finally {
      lockRef.current = false;
      setIsLoadingMore(false);
    }
  }, [runtime, limitRef, hasMoreRef]);

  return (
    <ThreadListPaginationContext.Provider value={{ loadMore, hasMore, isLoadingMore }}>
      {children}
    </ThreadListPaginationContext.Provider>
  );
}
