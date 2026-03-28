import { describe, expect, it, vi } from "vitest";

/**
 * waitForUserTool 行为契约 (基于计划二 §七):
 *
 * - 首次调用 (无 resumeData): 调用 agent.suspend() 暂停 agent
 * - 恢复调用 (有 resumeData): 返回 { completed: true, userMessage }
 * - 恢复但无 userMessage: 使用默认文案 "用户操作完成"
 *
 * Mastra Tool.execute(inputData, context) 签名:
 *   inputData = validated input (e.g. { reason })
 *   context   = ToolExecutionContext, with context.agent.suspend / context.agent.resumeData
 */
describe("waitForUserTool", () => {
  async function getTool() {
    const mod = await import("../../../src/main/agent/wait-for-user");
    const tool = mod.waitForUserTool;
    if (!tool.execute) throw new Error("tool.execute is not defined");
    return tool as typeof tool & { execute: NonNullable<typeof tool.execute> };
  }

  it("calls agent.suspend with reason when no resumeData (first call)", async () => {
    const tool = await getTool();
    const mockSuspend = vi.fn();

    await tool.execute(
      { reason: "请完成登录操作" },
      {
        agent: {
          agentId: "test",
          toolCallId: "tc-1",
          messages: [],
          resumeData: undefined,
          suspend: mockSuspend,
        },
      },
    );

    expect(mockSuspend).toHaveBeenCalled();
    const payload = mockSuspend.mock.calls[0][0];
    expect(payload).toEqual({
      reason: "请完成登录操作",
      waitingFor: "user_action",
    });
  });

  it("returns completed=true with userMessage when resumed", async () => {
    const tool = await getTool();

    const result = await tool.execute(
      { reason: "请完成登录操作" },
      {
        agent: {
          agentId: "test",
          toolCallId: "tc-1",
          messages: [],
          resumeData: { userMessage: "我登录好了" },
          suspend: vi.fn(),
        },
      },
    );

    expect(result).toEqual({
      completed: true,
      userMessage: "我登录好了",
    });
  });

  it("returns default message when resumed without userMessage", async () => {
    const tool = await getTool();

    const result = await tool.execute(
      { reason: "请完成验证" },
      {
        agent: {
          agentId: "test",
          toolCallId: "tc-1",
          messages: [],
          resumeData: {},
          suspend: vi.fn(),
        },
      },
    );

    expect(result).toEqual({
      completed: true,
      userMessage: "用户操作完成",
    });
  });

  it("has correct tool metadata", async () => {
    const tool = await getTool();

    expect(tool.id).toBe("wait_for_user");
    expect(tool.description).toBeDefined();
    expect(tool.description.length).toBeGreaterThan(0);
  });
});
