# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev            # start web (vite:5173) + Electron concurrently
pnpm dev:server     # standalone server only (tsx watch, port 3100)
pnpm dev:web        # web frontend only (vite)
pnpm build          # build server (tsup) then web (vite build)
pnpm package        # build all, copy web/dist into electron, then electron-builder
pnpm test           # vitest run (all packages)
pnpm test:watch     # vitest watch
pnpm lint           # biome check (lint + format)
pnpm lint:fix       # biome check --fix
pnpm format         # biome format --fix
```

Run a single test file:
```bash
pnpm vitest run packages/server/tests/path/to/test.ts
```

Test files live in `packages/*/tests/` mirroring `src/` structure.

## Monorepo Structure

pnpm workspace with three packages:

```
packages/
├── server/    # @browser-agent/server — Node.js backend (library + standalone HTTP)
├── web/       # @browser-agent/web   — React 19 + assistant-ui + Tailwind v4 frontend
└── electron/  # @browser-agent/electron — Electron shell (imports server in-process)
```

- **server** is both a library (imported by Electron) and a standalone HTTP server (port 3100)
- **web** can run against Electron's custom protocol or standalone against the HTTP server
- **electron** is a thin shell: it loads the server in-process and serves the web frontend

### Package Dependencies

```
electron → server (workspace:*)
web → (standalone, connects via HTTP or agent:// protocol)
```

## Architecture

### Server (`packages/server`)

Central factory: `createApp()` in `src/index.ts` returns an `AppInstance` with all shared state.

```
src/
├── index.ts          # createApp() factory, AppInstance type, all re-exports
├── server.ts         # standalone HTTP server (port 3100)
├── agent/
│   ├── browser-agent.ts   # createBrowserAgent(): Mastra Agent with memory, 50 maxSteps
│   ├── browser-tools.ts   # MCP client init, auto-restart on browser crash
│   ├── mastra.ts          # createMastra(): LibSQLStore + PinoLogger
│   ├── overlay.ts         # OverlayController: injects JS into Chrome pages
│   ├── system-prompt.ts   # System prompt with tool reference + canvas mode
│   ├── title-agent.ts     # Generates thread titles
│   ├── wait-for-user.ts   # suspend/resume for human-in-the-loop
│   └── tracer.ts          # JSONL trace files per runId
├── api/
│   ├── chat.ts            # createChatStream/createChatResponse via handleChatStream
│   ├── settings.ts        # getSettings/updateSetting + rebuild on change
│   ├── threads.ts         # CRUD for threads/messages via Mastra memory (uuidv7)
│   └── title.ts           # generateTitle via titleAgent
├── routes/                # HTTP route handlers (standalone server mode)
├── skills/                # SkillManager scans ~/.browser-agent/skills/*/SKILL.md
└── store/
    └── settings.ts        # AppSettings type + conf store
```

**Agent stack**: Mastra orchestrates `browserAgent` with `@playwright/mcp` for browser automation, libsql for memory, and a `wait_for_user` suspend tool.

**Browser tool lifecycle**: `browser-tools.ts` wraps MCP tools with auto-restart — if a "browser closed" error is detected, the MCP client restarts automatically and retries.

### Web (`packages/web`)

```
src/
├── api/
│   ├── adapter.ts     # ApiAdapter interface + auto-detect Electron vs HTTP
│   ├── electron.ts    # agent:// protocol + IPC adapter
│   └── http.ts        # localhost:3100 REST adapter
├── components/
│   ├── RuntimeProvider.tsx    # AssistantRuntimeProvider + thread list runtime
│   ├── assistant-ui/          # Thread, ThreadList, MarkdownText, etc.
│   ├── chat/                  # WelcomePage
│   ├── settings/              # ModelConfig, BrowserConfig, SettingsPanel
│   ├── skills/                # SkillsPanel, SkillEditor
│   └── ui/                    # Shared primitives
├── lib/
│   ├── browser-tool-uis.tsx   # Custom tool renderers for Playwright actions
│   ├── history-adapter.ts     # ServerHistoryAdapter: loads persisted messages
│   ├── thread-adapter.ts      # RemoteThreadListAdapter with threadIdMap
│   └── thread-list-pagination.tsx  # Infinite scroll (uses AUI internals)
└── stores/
    └── settings.ts            # Zustand (settings only)
```

**RuntimeProvider** is the central wiring: combines `useChat` (`@ai-sdk/react`) with `useAISDKRuntime` (`@assistant-ui/react-ai-sdk`) and `useRemoteThreadListRuntime`.

**Dual-mode API**: `ApiAdapter` detects `window.electronAPI` at import time. Electron mode uses `agent://` protocol + IPC; standalone mode uses HTTP REST to `localhost:3100`.

### Electron (`packages/electron`)

Thin shell that imports `createApp` from server and serves the web frontend:

```
src/
├── main/
│   ├── index.ts           # App lifecycle, protocol handler for agent://chat
│   ├── windows.ts         # Frameless BrowserWindow (960x720)
│   ├── frontend-loader.ts # Loads from dev URL, userData, or packaged resources
│   └── ipc/               # settings + threads IPC handlers
└── preload/
    └── index.ts           # contextBridge → window.electronAPI.settings + .threads
```

### Communication

| Mode | Chat | Settings | Threads |
|------|------|----------|---------|
| Electron | `agent://chat` (custom protocol) | IPC (`ipcMain.handle`) | IPC |
| Standalone | `POST http://localhost:3100/api/chat` | HTTP REST | HTTP REST |

Chat uses SSE streaming via `handleChatStream` from `@mastra/ai-sdk` (Vercel AI SDK v6 `UIMessageStream` protocol).

### AppSettings Shape

```typescript
interface AppSettings {
  model: { provider: string; name: string; apiKey: string };
  browser: { headless: boolean; browser: "chrome" | "firefox" | "webkit"; executablePath?: string; userDataDir?: string };
  skills: { directory: string };
}
```

Defaults: provider=openai, name=gpt-4.1, headless=false, browser=chrome, skills=~/.browser-agent/skills.

## Code Style

Biome is the single tool for linting and formatting (no ESLint, no Prettier):
- 2-space indent, double quotes, semicolons always, trailing commas, 100-char line width
- `noExplicitAny` is an **error** — avoid `any`; use `unknown` + type guards
- Husky pre-commit hook runs lint-staged (biome check + format on staged `*.{ts,tsx}` and format on `*.{json,css}`)
- Root `tsconfig.json` uses project references to all three sub-packages
- CSS: Tailwind v4 with cssModules + `@tailwindcss/vite` plugin

## Release

CI workflow (`.github/workflows/release.yml`) triggers on tag push:

| Tag prefix | Behavior |
|------------|----------|
| `v*` (e.g. `v1.0.5`) | Full build and release: web zip + version.json + Electron app |
| `w*` (e.g. `w1.0.5`) | Web only: build and release web zip + version.json |

Manual `workflow_dispatch` is also available for selective publishing.

### Tagging Rules

When asked to create a release tag, determine the correct prefix automatically:

1. Find the latest tag: `git describe --tags --abbrev=0 --match "v*" --match "w*"`
2. Get changed files: `git diff --name-only <lastTag>..HEAD`
3. Choose prefix:
   - All changed files are under `packages/web/` → use `w` prefix (web-only release)
   - Any file outside `packages/web/` is changed → use `v` prefix (full release)
4. Present the result and chosen tag to the user for confirmation before executing
5. If unable to determine (no previous tags, dirty working tree, ambiguous state), ask the user directly
