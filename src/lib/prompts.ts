import yaml from 'js-yaml';
import fs from 'fs';
import path from 'path';

type LanguageVars = Record<string, string>;

type PromptsYaml = {
  language_settings: Record<string, LanguageVars>;
  conversation: { system_prompt: string; [key: string]: unknown };
  diary_generation: { system_prompt: string; [key: string]: unknown };
  stt: Record<string, unknown>;
};

let _config: PromptsYaml | null = null;

export function getRawConfig(): PromptsYaml {
  if (!_config || process.env.NODE_ENV === "development") {
    const filePath = path.join(process.cwd(), "prompts.yml");
    const file = fs.readFileSync(filePath, "utf8");
    _config = yaml.load(file) as PromptsYaml;
  }
  return _config;
}

function resolvePrompt(
  prompt: string,
  lang: string,
  extraVars?: Record<string, string>
) {
  const config = getRawConfig();
  const vars: Record<string, string> = {
    ...config.language_settings[lang],
    ...extraVars,
  };
  return prompt.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`);
}

// 返回对话配置
export function getConversationConfig(lang: string) {
  const config = getRawConfig();
  return {
    ...config.conversation,
    system_prompt: resolvePrompt(config.conversation.system_prompt, lang),
  };
}

export function getDiaryConfig(
  lang: string,
  extraVars?: Record<string, string>
) {
  const config = getRawConfig();
  return {
    ...config.diary_generation,
    system_prompt: resolvePrompt(
      config.diary_generation.system_prompt,
      lang,
      extraVars
    ),
  };
}

export function getSTTConfig(lang: string) {
  const config = getRawConfig();
  const vars = config.language_settings[lang];
  return {
    ...config.stt,
    language: vars.stt_language,
  };
}