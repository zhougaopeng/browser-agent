import { useState } from "react";
import { SkillEditor } from "./SkillEditor";
import { SkillImport } from "./SkillImport";

interface Skill {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
}

export function SkillsPanel() {
  const [skills] = useState<Skill[]>([]);
  const [selectedSkillId, setSelectedSkillId] = useState<string | null>(null);
  const [showImport, setShowImport] = useState(false);

  if (showImport) {
    return <SkillImport onBack={() => setShowImport(false)} />;
  }

  if (selectedSkillId) {
    const skill = skills.find((s) => s.id === selectedSkillId);
    if (skill) {
      return <SkillEditor skill={skill} onBack={() => setSelectedSkillId(null)} />;
    }
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-lg px-6 py-6">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-lg font-semibold text-gray-800">Skills</h1>
          <button
            type="button"
            onClick={() => setShowImport(true)}
            className="rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-accent-hover"
          >
            导入
          </button>
        </div>

        {skills.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-3xl">📦</p>
            <p className="mt-2 text-sm text-gray-400">还没有 Skills</p>
            <p className="mt-1 text-xs text-gray-400">
              将 SKILL.md 放入 ~/.browser-agent/skills/ 目录
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {skills.map((skill) => (
              <button
                type="button"
                key={skill.id}
                onClick={() => setSelectedSkillId(skill.id)}
                className="flex items-center justify-between rounded-lg border border-border bg-home-input-bg px-4 py-3 text-left transition-colors hover:border-border"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-800">{skill.name}</p>
                  <p className="mt-0.5 truncate text-xs text-gray-400">{skill.description}</p>
                </div>
                <span
                  className={`ml-3 h-2 w-2 shrink-0 rounded-full ${
                    skill.enabled ? "bg-green-400" : "bg-gray-300"
                  }`}
                />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
