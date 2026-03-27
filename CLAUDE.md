# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev          # start Electron app in dev mode (hot reload)
pnpm build        # build all three processes (main, preload, renderer)
pnpm package      # package distributable with electron-builder
pnpm test         # run all tests once
pnpm test:watch   # run tests in watch mode
pnpm lint         # biome check (lint + format check)
pnpm lint:fix     # biome check --fix (auto-fix lint issues)
pnpm format       # biome format --fix (auto-format)
```

Run a single test file:
```bash
pnpm vitest run tests/main/agent/overlay.test.ts
```

Test files live in `tests/` mirroring `src/main/` and `src/renderer/` structure.

## Architecture

Electron app with three processes:

```
src/
├── main/          # Node.js Main Process — all backend logic
│   ├── index.ts   # entry: protocol registration, app lifecycle, chat endpoint
│   ├── windows.ts # BrowserWindow creation
│   ├── agent/     # Mastra agent, MCP client, overlay, suspend tool
│   ├── ipc/       # IPC handlers (settings only)
│   ├── skills/    # SkillManager, read_skill tool
│   ├── store/     # electron-store settings persistence
│   └── paths.ts   # shared path constants
├── preload/
│   └── index.ts   # contextBridge — exposes window.electronAPI.settings
└── renderer/      # React 19 + Tailwind CSS 4
    ├── App.tsx
    ├── components/
    │   ├── chat/      # ChatPanel, MessageBubble, ActionCard, WaitCard, etc.
    │   ├── settings/  # ModelConfig, BrowserConfig, SettingsPanel
    │   ├── skills/    # SkillsPanel, SkillEditor, SkillImport
    │   └── layout/    # TitleBar (frameless), Sidebar
    └── stores/
        └── settings.ts  # Zustand — only for app settings, chat state is in useChat
```

### Communication

| Channel | Mechanism | Usage |
|---------|-----------|-------|
| Chat streaming | `protocol.handle("agent://")` | Renderer `fetch("agent://chat", POST)` → Main streams AI SDK DataStream back |
| Settings | IPC (`ipcMain.handle` / `ipcRenderer.invoke`) | `settings:get`, `settings:set`, `settings:changed` (push) |

The renderer's `useChat` hook points its `api` to `"agent://chat"`. No localhost HTTP server is used.

### Agent Stack

- **Mastra** orchestrates the `browserAgent` with memory (libsql via `mastra.db`)
- **Playwright MCP** client (`@playwright/mcp`) launches an independent Chrome window; all browser automation goes through MCP tool calls
- **`wait_for_user`** tool calls Mastra's `suspend()` for human-in-the-loop; `autoResumeSuspendedTools: true` handles resume automatically
- **Overlay**: `overlay-init.js` is injected into every Chrome page via `--init-script`; `overlayController` switches CSS states by calling `browser_evaluate` in `onStepFinish`
- **Skills**: `SkillManager` scans `~/.browser-agent/skills/` for `SKILL.md` files at startup, builds a lightweight name+description catalog injected into the system prompt, and provides a `read_skill` tool for the agent to load full skill content on demand

### Key Data Flows

**Chat request:**
1. `ChatPanel` (useChat) → `fetch("agent://chat", { messages, threadId })`
2. `protocol.handle` in `main/index.ts` calls `agentInstance.stream()`
3. Mastra calls LLM → MCP browser tools → `onStepFinish` updates overlay
4. DataStream response flows back to `useChat` for streaming render

**Settings change:**
1. SettingsPanel → `window.electronAPI.settings.set(key, value)`
2. IPC handler updates `electron-store`, pushes `settings:changed` to renderer
3. If browser settings changed, MCP client is torn down and rebuilt

### AppSettings Shape

```typescript
interface AppSettings {
  model: { provider: string; name: string; apiKey: string };
  browser: { headless: boolean; browser: "chrome" | "firefox" | "webkit"; executablePath?: string; userDataDir?: string };
  skills: { directory: string };
}
```

## Code Style

Biome is the single tool for linting and formatting (no ESLint, no Prettier):
- 2-space indent, double quotes, semicolons always, trailing commas, 100-char line width
- `noExplicitAny` is an **error** — avoid `any`; use `unknown` + type guards
- Three separate `tsconfig` files: root (`tsconfig.json`), `tsconfig.node.json` (main + preload), `tsconfig.web.json` (renderer)
