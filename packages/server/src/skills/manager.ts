import { mkdir, readdir, readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import type { SkillMeta } from "./types";

const DEFAULT_SKILLS_DIR = join(homedir(), ".browser-agent", "skills");

class SkillManager {
  private skillsDir: string;

  constructor(skillsDir?: string) {
    this.skillsDir = skillsDir ?? DEFAULT_SKILLS_DIR;
  }

  setDirectory(dir: string): void {
    this.skillsDir = dir.startsWith("~") ? dir.replace("~", homedir()) : dir;
  }

  async scanAll(): Promise<SkillMeta[]> {
    await mkdir(this.skillsDir, { recursive: true });

    let entries: string[];
    try {
      entries = await readdir(this.skillsDir);
    } catch {
      return [];
    }

    const skills: SkillMeta[] = [];
    for (const entry of entries) {
      const skillFile = join(this.skillsDir, entry, "SKILL.md");
      try {
        const content = await readFile(skillFile, "utf-8");
        const meta = this.parseMeta(entry, skillFile, content);
        if (meta) skills.push(meta);
      } catch {
        // not a valid skill directory — skip
      }
    }
    return skills;
  }

  async readSkill(skillId: string): Promise<string | null> {
    const skillFile = join(this.skillsDir, skillId, "SKILL.md");
    try {
      return await readFile(skillFile, "utf-8");
    } catch {
      return null;
    }
  }

  buildCatalog(skills: SkillMeta[]): string {
    if (skills.length === 0) return "";
    const lines = skills.map((s) => `- **${s.name}** (id: \`${s.id}\`): ${s.description}`);
    return (
      "\n\n## Available Skills\n" +
      "When a user's request matches a skill below, call `read_skill(skillId)` BEFORE starting browser actions.\n\n" +
      lines.join("\n")
    );
  }

  private parseMeta(dirName: string, filePath: string, content: string): SkillMeta | null {
    const nameMatch = content.match(/^#\s+(.+)$/m);
    if (!nameMatch) return null;

    const name = nameMatch[1].trim();
    const afterHeading = content.slice((nameMatch.index ?? 0) + nameMatch[0].length).trim();
    const descLine = afterHeading.split("\n").find((l) => l.trim().length > 0);
    const description = descLine?.trim() ?? "";

    return { id: dirName, name, description, path: filePath };
  }
}

export const skillManager = new SkillManager();
