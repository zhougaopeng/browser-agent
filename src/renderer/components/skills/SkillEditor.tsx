interface Skill {
  id: string;
  name: string;
  description: string;
}

interface SkillEditorProps {
  skill: Skill;
  onBack: () => void;
}

export function SkillEditor({ skill, onBack }: SkillEditorProps) {
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

        <h1 className="mb-1 text-lg font-semibold text-gray-800">{skill.name}</h1>
        <p className="mb-6 text-xs text-gray-400">{skill.description}</p>

        <div className="rounded-lg border border-gray-200 bg-gray-50">
          <div className="border-b border-gray-200 px-4 py-2">
            <span className="text-xs font-medium text-gray-500">SKILL.md</span>
          </div>
          <textarea
            className="w-full resize-none bg-transparent p-4 font-mono text-xs leading-relaxed text-gray-700 outline-none"
            rows={20}
            placeholder="Skill 内容加载中..."
            readOnly
          />
        </div>
      </div>
    </div>
  );
}
