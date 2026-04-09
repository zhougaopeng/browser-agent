import { normalizeHeaders, resolve } from "@ai-sdk/provider-utils";
import { type ChatTransport, DefaultChatTransport, type UIMessage } from "ai";
import { pendingThreadIds, threadIdMap } from "../lib/thread-adapter";

export class BrowserAgentTransport<T extends UIMessage> extends DefaultChatTransport<T> {
  async sendMessages({ abortSignal, ...options }: Parameters<ChatTransport<T>["sendMessages"]>[0]) {
    const chatId = options.chatId;
    const isNew = chatId.startsWith("__LOCALID_") && !threadIdMap.has(chatId);

    if (isNew) {
      pendingThreadIds.set(chatId, Promise.withResolvers<string>());
    }

    const resolvedBody = await resolve(this.body);
    const resolvedHeaders = await resolve(this.headers);
    const resolvedCredentials = await resolve(this.credentials);

    // For "submit-message", server-side MessageHistory processor loads conversation
    // history from storage, so we only need to send the new user message.
    // For "regenerate-message", send the last two messages (user + assistant being
    // regenerated) so handleChatStream can extract lastMessageId.
    const messages =
      options.trigger === "submit-message"
        ? options.messages.slice(-1)
        : options.trigger === "regenerate-message"
          ? options.messages.slice(-2)
          : options.messages;

    const body = {
      ...resolvedBody,
      ...options.body,
      ...(isNew ? {} : { id: threadIdMap.get(chatId) ?? chatId }),
      messages,
      trigger: options.trigger,
      messageId: options.messageId,
    };

    const fetchFn = this.fetch ?? globalThis.fetch;
    const response = await fetchFn(this.api, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...normalizeHeaders(resolvedHeaders),
        ...normalizeHeaders(options.headers),
      },
      body: JSON.stringify(body),
      credentials: resolvedCredentials,
      signal: abortSignal,
    });

    if (!response.ok) {
      throw new Error((await response.text()) || "Failed to fetch chat response.");
    }

    if (isNew) {
      const realId = response.headers.get("X-Thread-Id");
      if (realId) {
        threadIdMap.set(chatId, realId);
        pendingThreadIds.get(chatId)?.resolve(realId);
      }
    }

    if (!response.body) {
      throw new Error("The response body is empty.");
    }

    return this.processResponseStream(response.body);
  }
}
