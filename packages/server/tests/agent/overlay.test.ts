import { beforeEach, describe, expect, it, vi } from "vitest";

const mockExecute = vi.fn().mockResolvedValue(undefined);

vi.mock("../../src/agent/browser-tools", () => ({
  getBrowserTools: vi.fn(() => ({
    browser_evaluate: { execute: mockExecute },
  })),
}));

import { OverlayController } from "../../src/agent/overlay";

describe("OverlayController", () => {
  let controller: OverlayController;

  beforeEach(() => {
    mockExecute.mockClear();
    controller = new OverlayController();
  });

  describe("showAutomating", () => {
    it("evaluates automating overlay expression via browser_evaluate", async () => {
      await controller.showAutomating();

      expect(mockExecute).toHaveBeenCalledWith(
        { function: expect.stringContaining("automating") },
        {},
      );
    });
  });

  describe("showWaiting", () => {
    it("evaluates waiting overlay expression with reason text", async () => {
      await controller.showWaiting("请完成登录操作");

      expect(mockExecute).toHaveBeenCalledWith(
        { function: expect.stringContaining("waiting") },
        {},
      );
      expect(mockExecute).toHaveBeenCalledWith(
        { function: expect.stringContaining("请完成登录操作") },
        {},
      );
    });
  });

  describe("hide", () => {
    it("evaluates hide expression", async () => {
      await controller.hide();

      expect(mockExecute).toHaveBeenCalledWith({ function: expect.stringContaining("hide") }, {});
    });
  });

  describe("handleStep", () => {
    it("calls showWaiting when event contains wait_for_user tool-call", async () => {
      const event = {
        toolCalls: [
          {
            toolName: "wait_for_user",
            type: "tool-call",
            args: { reason: "请完成登录" },
          },
        ],
      };

      await controller.handleStep(event);

      expect(mockExecute).toHaveBeenCalledWith(
        { function: expect.stringContaining("waiting") },
        {},
      );
      expect(mockExecute).toHaveBeenCalledWith(
        { function: expect.stringContaining("请完成登录") },
        {},
      );
    });

    it("calls showAutomating when event contains browser tool calls", async () => {
      const event = {
        toolCalls: [{ toolName: "browser_navigate", type: "tool-call", args: {} }],
      };

      await controller.handleStep(event);

      expect(mockExecute).toHaveBeenCalledWith(
        { function: expect.stringContaining("automating") },
        {},
      );
    });

    it("prioritizes wait_for_user over other tool calls", async () => {
      const event = {
        toolCalls: [
          { toolName: "browser_click", type: "tool-call", args: {} },
          {
            toolName: "wait_for_user",
            type: "tool-call",
            args: { reason: "请输入验证码" },
          },
        ],
      };

      await controller.handleStep(event);

      expect(mockExecute).toHaveBeenCalledTimes(1);
      expect(mockExecute).toHaveBeenCalledWith(
        { function: expect.stringContaining("waiting") },
        {},
      );
    });

    it("does nothing when event has no tool calls", async () => {
      await controller.handleStep({});
      expect(mockExecute).not.toHaveBeenCalled();
    });

    it("does nothing when toolCalls is empty array", async () => {
      await controller.handleStep({ toolCalls: [] });
      expect(mockExecute).not.toHaveBeenCalled();
    });

    it("ignores wait_for_user with type tool-result (not tool-call)", async () => {
      const event = {
        toolCalls: [
          {
            toolName: "wait_for_user",
            type: "tool-result",
            args: { reason: "done" },
          },
        ],
      };

      await controller.handleStep(event);

      expect(mockExecute).toHaveBeenCalledWith(
        { function: expect.stringContaining("automating") },
        {},
      );
    });
  });
});
