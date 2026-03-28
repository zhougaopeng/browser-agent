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
          <p className="text-sm leading-relaxed whitespace-pre-wrap">
            {message.parts
              ?.filter((p) => p.type === "text")
              .map((p) => p.text)
              .join("") ?? ""}
          </p>
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
              if (part.type === "dynamic-tool") {
                if (part.toolName === "wait_for_user") {
                  return <WaitCard key={part.toolCallId} invocation={part} />;
                }
                if (part.toolName === "browser_screenshot" && part.state === "output-available") {
                  return <ScreenshotCard key={part.toolCallId} invocation={part} />;
                }
                return <ActionCard key={part.toolCallId} invocation={part} />;
              }
              return null;
            })}
          </div>
        )}
      </div>
    </div>
  );
}
