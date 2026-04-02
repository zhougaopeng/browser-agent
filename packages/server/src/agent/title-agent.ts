import { Agent } from "@mastra/core/agent";

const TITLE_INSTRUCTIONS = `Generate a short title for a conversation based on the messages provided.
Rules:
- Maximum 80 characters
- Summarize the core topic or user's intent based on both the user's request and the assistant's response
- Do not use quotes or colons
- Return only the title text, nothing else`;

export function createTitleAgent(modelId: string): Agent {
  return new Agent({
    id: "title-agent",
    name: "Title Agent",
    instructions: TITLE_INSTRUCTIONS,
    model: modelId,
  });
}
