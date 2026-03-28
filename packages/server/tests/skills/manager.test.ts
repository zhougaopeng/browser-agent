import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("fs/promises");
vi.mock("os", () => ({
  homedir: () => "/mock-home",
}));

interface MockFs {
  mkdir: ReturnType<typeof vi.fn>;
  readdir: ReturnType<typeof vi.fn>;
  readFile: ReturnType<typeof vi.fn>;
}

describe("SkillManager", () => {
  let fs: MockFs;

  beforeEach(async () => {
    vi.clearAllMocks();
    fs = (await import("node:fs/promises")) as unknown as MockFs;
  });

  async function getManager() {
    vi.resetModules();
    const mod = await import("../../src/skills/manager");
    return mod.skillManager;
  }

  describe("scanAll", () => {
    it("returns skill metas from skills directory", async () => {
      fs.mkdir = vi.fn().mockResolvedValue(undefined);
      fs.readdir = vi.fn().mockResolvedValue(["feishu-doc", "github-pr"]);
      fs.readFile = vi
        .fn()
        .mockResolvedValueOnce("# 飞书文档\n创建和编辑飞书文档\n\n详细内容...")
        .mockResolvedValueOnce("# GitHub PR\n创建 GitHub Pull Request\n\n详细内容...");

      const manager = await getManager();
      const skills = await manager.scanAll();

      expect(skills).toHaveLength(2);
      expect(skills[0]).toMatchObject({
        id: "feishu-doc",
        name: "飞书文档",
        description: "创建和编辑飞书文档",
      });
      expect(skills[1]).toMatchObject({
        id: "github-pr",
        name: "GitHub PR",
        description: "创建 GitHub Pull Request",
      });
    });

    it("returns empty array when directory is empty", async () => {
      fs.mkdir = vi.fn().mockResolvedValue(undefined);
      fs.readdir = vi.fn().mockResolvedValue([]);

      const manager = await getManager();
      const skills = await manager.scanAll();

      expect(skills).toEqual([]);
    });

    it("creates directory if it does not exist", async () => {
      fs.mkdir = vi.fn().mockResolvedValue(undefined);
      fs.readdir = vi.fn().mockResolvedValue([]);

      const manager = await getManager();
      await manager.scanAll();

      expect(fs.mkdir).toHaveBeenCalledWith(
        expect.stringContaining("skills"),
        expect.objectContaining({ recursive: true }),
      );
    });

    it("skips entries without valid SKILL.md", async () => {
      fs.mkdir = vi.fn().mockResolvedValue(undefined);
      fs.readdir = vi.fn().mockResolvedValue(["readme.txt", "valid-skill"]);
      fs.readFile = vi
        .fn()
        .mockRejectedValueOnce(new Error("ENOENT"))
        .mockResolvedValueOnce("# Valid\nA valid skill\n");

      const manager = await getManager();
      const skills = await manager.scanAll();

      expect(skills).toHaveLength(1);
      expect(skills[0].id).toBe("valid-skill");
    });

    it("skips skill directories without SKILL.md", async () => {
      fs.mkdir = vi.fn().mockResolvedValue(undefined);
      fs.readdir = vi.fn().mockResolvedValue(["broken-skill"]);
      fs.readFile = vi.fn().mockRejectedValue(new Error("ENOENT"));

      const manager = await getManager();
      const skills = await manager.scanAll();

      expect(skills).toEqual([]);
    });

    it("skips SKILL.md without a markdown heading", async () => {
      fs.mkdir = vi.fn().mockResolvedValue(undefined);
      fs.readdir = vi.fn().mockResolvedValue(["no-heading"]);
      fs.readFile = vi.fn().mockResolvedValue("This file has no heading\nJust text.");

      const manager = await getManager();
      const skills = await manager.scanAll();

      expect(skills).toEqual([]);
    });

    it("includes path to SKILL.md in SkillMeta", async () => {
      fs.mkdir = vi.fn().mockResolvedValue(undefined);
      fs.readdir = vi.fn().mockResolvedValue(["my-skill"]);
      fs.readFile = vi.fn().mockResolvedValue("# My Skill\nDoes things\n");

      const manager = await getManager();
      const skills = await manager.scanAll();

      expect(skills[0].path).toContain("my-skill");
      expect(skills[0].path).toContain("SKILL.md");
    });
  });

  describe("buildCatalog", () => {
    it("returns empty string for empty skills array", async () => {
      const manager = await getManager();
      const catalog = manager.buildCatalog([]);

      expect(catalog).toBe("");
    });

    it("includes skill id, name and description in catalog", async () => {
      const manager = await getManager();
      const catalog = manager.buildCatalog([
        {
          id: "feishu-doc",
          name: "飞书文档",
          description: "创建和编辑飞书文档",
          path: "/path/to/feishu-doc",
        },
      ]);

      expect(catalog).toContain("feishu-doc");
      expect(catalog).toContain("飞书文档");
      expect(catalog).toContain("创建和编辑飞书文档");
    });

    it("formats multiple skills", async () => {
      const manager = await getManager();
      const catalog = manager.buildCatalog([
        { id: "skill-a", name: "Skill A", description: "Desc A", path: "/a" },
        { id: "skill-b", name: "Skill B", description: "Desc B", path: "/b" },
      ]);

      expect(catalog).toContain("skill-a");
      expect(catalog).toContain("skill-b");
      expect(catalog).toContain("Skill A");
      expect(catalog).toContain("Skill B");
    });
  });
});
