import type { ToolsInput } from "@mastra/core/agent";
import { Agent } from "@mastra/core/agent";
import type { InputProcessorOrWorkflow } from "@mastra/core/processors";
import { Memory } from "@mastra/memory";
import { readSkillTool } from "../skills/read-skill";
import { systemPrompt } from "./system-prompt";
import { waitForUserTool } from "./wait-for-user";

export interface BrowserAgentOptions {
  browserTools: ToolsInput;
  modelId: string;
  requestToolsTool?: ToolsInput[string];
  inputProcessors?: InputProcessorOrWorkflow[];
}

export function createBrowserAgent(opts: BrowserAgentOptions): Agent {
  const tools: ToolsInput = {
    ...opts.browserTools,
    wait_for_user: waitForUserTool,
    read_skill: readSkillTool,
  };

  if (opts.requestToolsTool) {
    tools.request_tools = opts.requestToolsTool;
  }

  return new Agent({
    id: "browser-agent",
    name: "Browser Agent",
    instructions: systemPrompt,
    model: opts.modelId,
    tools,
    inputProcessors: opts.inputProcessors,
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
