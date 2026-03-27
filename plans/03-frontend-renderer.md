# 计划三：前端（Renderer）设计

> 本文档聚焦 Renderer Process 内的前端逻辑：UI 设计、组件架构、状态管理、技术选型。

---

## 一、技术选型

| 模块 | 技术 | 理由 |
|------|------|------|
| 前端框架 | React 19 + TypeScript | 与 AI SDK 原生集成 |
| 聊天核心 | @ai-sdk/react (`useChat` hook) | 消息状态、流式渲染、工具调用全由 AI SDK 管理 |
| 聊天组件 | AI SDK Elements (`Conversation`, `PromptInput`) | 标准化聊天 UI |
| 样式 | Tailwind CSS 4 | 快速迭代 |
| 状态管理 | Zustand (仅设置) | 聊天状态由 AI SDK 管理，不需要额外 store |

---

## 二、目录结构

```
src/renderer/
├── index.html
├── main.tsx
├── App.tsx
├── stores/
│   └── settings.ts           # Zustand (仅设置)
├── components/
│   ├── chat/
│   │   ├── ChatPanel.tsx      # useChat 核心
│   │   ├── MessageBubble.tsx
│   │   ├── ActionCard.tsx     # 工具调用可视化
│   │   ├── ScreenshotCard.tsx # 截图内联展示
│   │   ├── WaitCard.tsx       # wait_for_user 等待卡片
│   │   ├── QuickActions.tsx   # 快捷操作按钮
│   │   └── InputBar.tsx
│   ├── settings/
│   │   ├── SettingsPanel.tsx
│   │   ├── ModelConfig.tsx
│   │   └── BrowserConfig.tsx  # headless, 浏览器类型, 路径
│   ├── skills/
│   │   ├── SkillsPanel.tsx
│   │   ├── SkillEditor.tsx
│   │   └── SkillImport.tsx
│   └── layout/
│       ├── TitleBar.tsx       # frameless 标题栏
│       └── Sidebar.tsx        # 会话列表
└── styles/
    └── globals.css
```

---

## 三、Chat UI 设计

### 3.1 核心：useChat + AI SDK Elements

```typescript
function ChatPanel() {
  const [threadId] = useState(() => crypto.randomUUID());

  const { messages, input, handleSubmit, setInput, status, stop } = useChat({
    api: 'agent://chat',
    maxSteps: 50,
    body: { threadId },
  });

  const isSuspended = useMemo(() => {
    const lastAssistant = [...messages].reverse().find(m => m.role === 'assistant');
    return lastAssistant?.parts?.some(
      p => p.type === 'tool-invocation' &&
           p.toolInvocation.toolName === 'wait_for_user' &&
           p.toolInvocation.state === 'call'
    );
  }, [messages]);

  const handleQuickResume = () => {
    setInput('我已完成操作，请继续执行');
    handleSubmit();
  };

  return (
    <div>
      <Conversation messages={messages} status={status}>
        {/* 自定义工具调用渲染: ActionCard, ScreenshotCard, WaitCard */}
      </Conversation>

      <PromptInput input={input} onInputChange={setInput} onSubmit={handleSubmit} />

      {isSuspended && (
        <QuickActions>
          <button onClick={handleQuickResume}>继续执行</button>
        </QuickActions>
      )}
    </div>
  );
}
```

### 3.2 AI SDK 天然提供的能力

| 能力 | 说明 |
|------|------|
| 消息流式渲染 | token-by-token |
| 工具调用追踪 | `toolInvocations` 字段自动追踪 pending → result |
| 请求状态 | `status`: submitted / streaming / ready / error |
| 多步执行 | `maxSteps` 参数 |
| 停止生成 | `stop()` 方法 |

### 3.3 自定义组件

- **ActionCard** — 浏览器工具调用卡片（工具名、参数摘要、状态）
- **ScreenshotCard** — 截图内联缩略图
- **WaitCard** — wait_for_user 等待状态（原因 + 脉冲动画）
- **QuickActions** — suspended 时显示的快捷按钮

---

## 四、Settings UI 设计

### 4.1 面板结构

```
Settings Panel
├── Model 配置
│   ├── Provider 选择 (OpenAI / Anthropic / ...)
│   ├── Model Name 输入/选择
│   └── API Key 输入 (密码模式)
├── Browser 配置
│   ├── 模式切换 (可视化 / 无头) — Toggle
│   ├── 浏览器类型 (Chrome / Firefox / WebKit)
│   ├── 可执行文件路径 (可选)
│   └── User Data Dir 路径 (可选)
└── Skills 配置
    └── Skills 根目录路径
```

> 注：Browser 配置修改后会触发 MCP 客户端重建（关闭旧 Chrome → 启动新 Chrome）。

### 4.2 状态管理 (Zustand)

```typescript
import { create } from 'zustand';

interface SettingsState {
  settings: AppSettings | null;
  loading: boolean;
  fetchSettings: () => Promise<void>;
  updateSetting: (key: string, value: unknown) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  settings: null,
  loading: true,
  fetchSettings: async () => {
    const settings = await window.electronAPI.settings.get();
    set({ settings, loading: false });
  },
  updateSetting: async (key, value) => {
    await window.electronAPI.settings.set(key, value);
  },
}));

window.electronAPI.settings.onChanged((settings) => {
  useSettingsStore.setState({ settings });
});
```

### 4.3 Headless 模式切换 UX

切换 headless 需要重建 MCP 客户端，有短暂不可用期：
1. 用户点击 Toggle
2. UI 显示 loading
3. 禁用聊天输入
4. 等待 `settings:changed` 确认重建完成
5. 恢复正常

---

## 五、Skills 管理 UI

- **SkillsPanel** — skill 列表 + 开关
- **SkillEditor** — SKILL.md 编辑器 + 子文件树
- **SkillImport** — 目录/zip 导入

---

## 六、布局

```
┌─────────────────────────────────────────────┐
│ TitleBar (frameless, draggable)              │
├─────────┬───────────────────────────────────┤
│         │                                    │
│ Sidebar │        Main Content               │
│ 会话列表 │   (Chat / Settings / Skills)       │
│         │                                    │
│ [Chat]  │                                    │
│ [设置]  │                                    │
│ [Skills]│                                    │
└─────────┴───────────────────────────────────┘
```

---

## 七、接口设计

### 7.1 聊天接口 (protocol.handle)

```typescript
fetch('agent://chat', {
  method: 'POST',
  body: JSON.stringify({ messages: Message[], threadId: string }),
});
// 响应: DataStream (ReadableStream), useChat 自动解析
```

### 7.2 设置接口 (IPC)

```typescript
interface ElectronAPI {
  settings: {
    get(): Promise<AppSettings>;
    set(key: string, value: unknown): Promise<void>;
    onChanged(cb: (settings: AppSettings) => void): void;
  };
}
```

### 7.3 共享类型

```typescript
interface AppSettings {
  model: { provider: string; name: string; apiKey: string };
  browser: {
    headless: boolean;
    browser: "chrome" | "firefox" | "webkit";
    executablePath?: string;
    userDataDir?: string;
  };
  skills: { directory: string };
}
```
