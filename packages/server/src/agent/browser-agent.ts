import type { ToolsInput } from "@mastra/core/agent";
import { Agent } from "@mastra/core/agent";
import { Memory } from "@mastra/memory";
import { readSkillTool } from "../skills/read-skill";
import { systemPrompt } from "./system-prompt";
import { AgentTracer } from "./tracer";
import { waitForUserTool } from "./wait-for-user";

export function createBrowserAgent(
  browserTools: ToolsInput,
  tracesDir: string,
  modelId: string,
): Agent {
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
    memory: new Memory(),
    defaultOptions: {
      maxSteps: 50,
      autoResumeSuspendedTools: true,
      onStepFinish: new AgentTracer("browser-agent", tracesDir).onStepFinish,
    },
  });
}
