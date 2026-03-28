interface SkillImportProps {
  onBack: () => void;
}

export function SkillImport({ onBack }: SkillImportProps) {
  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-lg px-6 py-6">
        <button
          type="button"
          onClick={onBack}
          className="mb-4 text-xs text-gray-500 hover:text-gray-700"
        >
          ← 返回列表
        </button>

        <h1 className="mb-6 text-lg font-semibold text-gray-800">导入 Skill</h1>

        <div className="flex flex-col gap-4">
          <div className="rounded-lg border-2 border-dashed border-border p-8 text-center transition-colors hover:border-accent/40">
            <p className="text-2xl">📁</p>
            <p className="mt-2 text-sm text-gray-500">拖放 Skill 目录到此处</p>
            <p className="mt-1 text-xs text-gray-400">目录中需包含 SKILL.md 文件</p>
          </div>

          <div className="text-center text-xs text-gray-400">或</div>

          <label className="block">
            <span className="mb-1 block text-xs text-gray-500">Skill 目录路径</span>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="/path/to/skill-directory"
                className="flex-1 rounded-lg border border-border bg-home-input-bg px-3 py-2 text-sm outline-none focus:border-accent/40"
              />
              <button
                type="button"
                className="rounded-lg bg-accent px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-accent-hover"
              >
                导入
              </button>
            </div>
          </label>
        </div>
      </div>
    </div>
  );
}
