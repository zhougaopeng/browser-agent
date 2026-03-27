import type { UIMessage } from "ai";
import { ActionCard } from "./ActionCard";
import { ScreenshotCard } from "./ScreenshotCard";
import { WaitCard } from "./WaitCard";

interface MessageBubbleProps {
  message: UIMessage;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] ${
          isUser ? "rounded-2xl rounded-br-md bg-accent px-3.5 py-2 text-white" : "w-full"
        }`}
      >
        {isUser ? (
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
        ) : (
          <div className="flex flex-col gap-2">
            {(message.parts ?? []).map((part) => {
              if (part.type === "text" && part.text) {
                return (
                  <p
                    key={part.text}
                    className="text-sm leading-relaxed text-gray-800 whitespace-pre-wrap"
                  >
                    {part.text}
                  </p>
                );
              }
              if (part.type === "tool-invocation") {
                const inv = part.toolInvocation;
                if (inv.toolName === "wait_for_user") {
                  return <WaitCard key={inv.toolCallId} invocation={inv} />;
                }
                if (inv.toolName === "browser_screenshot" && inv.state === "result") {
                  return <ScreenshotCard key={inv.toolCallId} invocation={inv} />;
                }
                return <ActionCard key={inv.toolCallId} invocation={inv} />;
              }
              return null;
            })}
          </div>
        )}
      </div>
    </div>
  );
}
