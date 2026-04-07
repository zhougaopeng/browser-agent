import type { ToolsInput } from "@mastra/core/agent";
import { Agent } from "@mastra/core/agent";
import { Memory } from "@mastra/memory";
import { readSkillTool } from "../skills/read-skill";
import { systemPrompt } from "./system-prompt";
import { waitForUserTool } from "./wait-for-user";

export function createBrowserAgent(browserTools: ToolsInput, modelId: string): Agent {
  return new Agent({
    id: "browser-agent",
    name: "Browser Agent",
    instructions: systemPrompt,
    model: modelId,
    tools: {
      ...browserTools,
      wait_for_user: waitForUserTool,
      read_skill: readSkillTool,
    },
    memory: new Memory({
      options: {
        lastMessages: 30,
        generateTitle: false,
      },
    }),
    defaultOptions: {
      maxSteps: 30,
      autoResumeSuspendedTools: true,
    },
  });
}
