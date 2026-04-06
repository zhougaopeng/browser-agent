import { getBrowserTools } from "./browser-tools";

export class OverlayController {
  async showAutomating(): Promise<void> {
    await this.evaluate(`window.__agentOverlay?.show('automating')`);
  }

  async showWaiting(reason: string): Promise<void> {
    const escaped = reason.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
    await this.evaluate(`window.__agentOverlay?.show('waiting','${escaped}')`);
  }

  async hide(): Promise<void> {
    await this.evaluate(`window.__agentOverlay?.hide()`);
  }

  async handleStep(event: unknown): Promise<void> {
    const e = event as {
      toolCalls?: { toolName: string; type: string; args?: Record<string, unknown> }[];
    };
    for (const call of e.toolCalls ?? []) {
      if (call.toolName === "wait_for_user" && call.type === "tool-call") {
        const reason = (call.args?.reason as string) || "等待用户操作...";
        await this.showWaiting(reason);
        return;
      }
    }
    if (e.toolCalls?.length) {
      await this.showAutomating();
    }
  }

  private async evaluate(code: string): Promise<void> {
    try {
      const tools = getBrowserTools();
      const evaluate = tools.browser_evaluate;
      if (!evaluate || !("execute" in evaluate) || !evaluate.execute) return;
      await (
        evaluate.execute as (params: Record<string, unknown>, ctx: unknown) => Promise<unknown>
      )({ function: code }, {});
    } catch {
      // browser_evaluate can fail if no page is open — silently ignore
    }
  }
}

export const overlayController = new OverlayController();
