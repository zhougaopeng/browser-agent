import type { AppInstance } from "../index";
import { renameThread } from "./threads";

interface TitleMessage {
  role: string;
  content: string;
}

export async function generateTitle(
  app: AppInstance,
  messages: TitleMessage[],
  threadId?: string,
): Promise<string> {
  const hasContent = messages.some((m) => m.content?.trim());
  if (!hasContent) {
    return "New Thread";
  }

  let title = "New Thread";
  try {
    const titleAgent = app.mastra.getAgent("titleAgent");
    const prompt = messages.map((m) => `${m.role}: ${m.content}`).join("\n\n");
    const result = await titleAgent.generate(prompt);
    title = result.text.trim() || "New Thread";
  } catch (err) {
    console.error("[title] Failed to generate title, using fallback:", err);
  }

  if (threadId) {
    await renameThread(app, threadId, title);
  }

  return title;
}
