# Browser Agent

> 一个由 AI 驱动的浏览器自动化桌面应用，集成 Playwright MCP 与 Mastra AI 框架，支持 Electron 桌面版与独立 Web 版双模式运行。

---

## 功能特性

- **自然语言驱动**：用自然语言描述任务，AI Agent 自动操作浏览器完成
- **人机协作（Human-in-the-loop）**：遇到登录、验证码、敏感操作时自动挂起，等待用户介入，完成后无缝恢复
- **多线程对话**：支持多会话线程管理，对话历史持久化存储（LibSQL）
- **Skills 系统**：通过 `~/.browser-agent/skills/*/SKILL.md` 定义可复用的自动化技能片段，Agent 可按需调用
- **视觉感知**：支持截图 + 无障碍树双模式页面理解，复杂 canvas/图表自动切换视觉模式
- **多 LLM 支持**：内置 OpenAI、Google、Anthropic、阿里云（通义）、月之暗面、智谱 AI 等主流提供商
- **Overlay 状态指示**：通过页面边框颜色直观显示 Agent 工作状态（蓝色=自动执行，绿色=等待用户）
- **双运行模式**：Electron 桌面 App（无端口暴露）+ 独立 HTTP Server（localhost:3100）

---

## 架构概览

```
┌──────────────────────────────────────────────────────┐
│  Renderer 层: Electron Chat Window / Web (React 19)  │
├──────────────────────────────────────────────────────┤
│  通信层: agent:// 自定义协议 + IPC / HTTP REST       │
├──────────────────────────────────────────────────────┤
│  Agent 层: Mastra Agent + Memory + Tools             │
├──────────────────────────────────────────────────────┤
│  执行层: Playwright MCP → 独立 Chrome 窗口           │
│          + CSS Overlay (--init-script 自动注入)       │
└──────────────────────────────────────────────────────┘
```

| 模式     | 聊天通信                       | 设置/线程        |
|----------|--------------------------------|------------------|
| Electron | `agent://chat` (自定义协议)    | IPC              |
| 独立服务 | `POST http://localhost:3100/api/chat` | HTTP REST |

---

## Monorepo 结构

```
packages/
├── server/     # @browser-agent/server — Node.js 后端（库 + 独立 HTTP 服务）
├── web/        # @browser-agent/web   — React 19 + assistant-ui + Tailwind v4 前端
├── shared/     # @browser-agent/shared — 共享类型定义
└── electron/   # @browser-agent/electron — Electron Shell（进程内加载 server）
```

- **server** 既可作为库被 Electron 直接 import，也可作为独立 HTTP 服务运行
- **web** 自动检测运行环境：Electron 模式走 `agent://` 协议，独立模式走 HTTP REST
- **electron** 是一个薄壳：加载 server 并提供 web 前端

---

## 快速开始

### 环境要求

- Node.js >= 22.13.0
- npm

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
# 同时启动 server + web + Electron（推荐）
npm run dev

# 仅启动后端服务（端口 3100）
npm run dev:server

# 仅启动 Web 前端（端口 5173）
npm run dev:web
```

### 配置

首次启动后，在**设置**面板中填写：

| 设置项 | 默认值 | 说明 |
|--------|--------|------|
| Model Provider | `openai` | 支持 openai、google、anthropic、alibaba、moonshotai、zhipuai 等 |
| Model Name | `gpt-4.1` | 所选 provider 下的模型名称 |
| API Key | — | 对应 provider 的 API Key |
| Browser | `chrome` | 支持 chrome / firefox / webkit |
| Headless | `false` | 是否无头模式（建议保持 false，便于人机协作） |
| Skills Directory | `~/.browser-agent/skills` | 自定义技能目录 |

---

## Skills 系统

在 `~/.browser-agent/skills/` 目录下创建子目录，每个子目录包含一个 `SKILL.md` 文件：

```
~/.browser-agent/skills/
└── my-skill/
    └── SKILL.md    # 用自然语言描述技能步骤
```

Agent 启动时会自动扫描并加载所有技能，可在对话中直接引用。

---

## 构建 & 打包

```bash
# 构建所有（server + web + electron）
npm run build

# 打包为桌面应用（macOS dmg/zip、Windows nsis、Linux AppImage）
npm run package

# 本地打包（不做签名验证）
npm run package:local
```

打包产物命名规则：`browser-agent-{version}-{arch}.{ext}`

### macOS 签名说明

默认使用 Ad-hoc 签名（无需 Apple 证书），macOS Sequoia 上首次运行需右键 → 打开。

如需正式签名，在 CI 环境中设置以下 Secrets：
`CSC_LINK` / `CSC_KEY_PASSWORD` / `APPLE_ID` / `APPLE_APP_SPECIFIC_PASSWORD` / `APPLE_TEAM_ID`

---

## CI/CD（GitHub Actions）

推送 `v*` 格式的 Tag 即自动触发多平台构建并发布到 GitHub Release：

```bash
git tag v1.0.0
git push origin v1.0.0
```

构建矩阵：macOS + Windows + Linux 三平台并行。发布产物：
- macOS: `.dmg` + `.zip`
- Windows: `.exe` (NSIS installer)
- Linux: `.AppImage`

> **注意**：如果 Web 前端也需独立部署，需在仓库 Secrets 中设置 `FRONTEND_BUNDLE_URL`，否则 Electron 内置前端。

---

## 开发指南

### 常用命令

```bash
npm run test          # 运行全部测试（vitest）
npm run test:watch    # 监听模式运行测试
npm run lint          # Biome 检查（lint + format）
npm run lint:fix      # 自动修复
npm run format        # 格式化
```

### 单文件测试

```bash
npx vitest run packages/server/tests/path/to/test.ts
```

### 代码规范

本项目使用 [Biome](https://biomejs.dev/) 作为唯一的 lint + format 工具：

- 缩进：2 空格
- 引号：双引号
- 分号：始终加
- 行宽：100 字符
- `any` 为错误，使用 `unknown` + 类型守卫

提交前 Husky 会自动运行 lint-staged。

---

## 技术栈

| 层级 | 技术 |
|------|------|
| 桌面框架 | Electron 37 |
| 前端框架 | React 19 + TypeScript |
| 聊天 UI | @assistant-ui/react + @ai-sdk/react |
| 样式 | Tailwind CSS v4 |
| 状态管理 | Zustand（仅设置）|
| AI 框架 | Mastra (@mastra/core) |
| 浏览器自动化 | @playwright/mcp |
| 持久化 | LibSQL（对话）+ conf（设置）|
| 构建 | Vite (web) + tsup (server) + electron-builder |
| 代码质量 | Biome + Husky + lint-staged |
| 测试 | Vitest |

---

## License

MIT
