import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { skillManager } from "./manager";

export const readSkillTool = createTool({
  id: "read_skill",
  description:
    "Load the full content of a skill by its ID. " +
    "Always call this BEFORE starting browser actions when the user's request matches a skill from the catalog.",
  inputSchema: z.object({
    skillId: z.string().describe("The skill ID from the catalog, e.g. 'feishu-docs'"),
  }),
  outputSchema: z.object({
    content: z.string(),
    found: z.boolean(),
  }),
  execute: async ({ skillId }) => {
    const content = await skillManager.readSkill(skillId);
    if (!content) {
      return { found: false, content: `Skill "${skillId}" not found.` };
    }
    return { found: true, content };
  },
});
