import { createTool } from "@mastra/core/tools";
import { z } from "zod";

export const waitForUserTool = createTool({
  id: "wait_for_user",
  description:
    "Pause automation and wait for user to complete an action in the browser. " +
    "Use whenever the agent cannot proceed on its own — login, CAPTCHA, " +
    "slider verification, SMS/email code, 2FA, payment confirmation, " +
    "permission grant, or any other blocker that requires manual user " +
    "intervention. The user will see a visual indicator and can resume " +
    "by sending a message.",
  inputSchema: z.object({
    reason: z.string().describe('Brief explanation shown to user, e.g. "请完成登录操作"'),
  }),
  outputSchema: z.object({
    completed: z.boolean(),
    userMessage: z.string().optional(),
  }),
  suspendSchema: z.object({
    reason: z.string(),
    waitingFor: z.string(),
  }),
  resumeSchema: z.object({
    userMessage: z.string().optional(),
  }),
  execute: async ({ reason }, context) => {
    const agent = context?.agent;
    if (agent?.resumeData) {
      return {
        completed: true,
        userMessage: (agent.resumeData as { userMessage?: string }).userMessage ?? "用户操作完成",
      };
    }
    await agent?.suspend({ reason, waitingFor: "user_action" });
    return { completed: false };
  },
});
