type LengthRange = { min: number; max: number };

const ZH_TIERS: { threshold: number; range: LengthRange }[] = [
  { threshold: 15, range: { min: 40, max: 80 } },
  { threshold: 40, range: { min: 80, max: 150 } },
  { threshold: 100, range: { min: 150, max: 250 } },
  { threshold: 200, range: { min: 250, max: 400 } },
  { threshold: Infinity, range: { min: 350, max: 600 } },
];

const EN_TIERS: { threshold: number; range: LengthRange }[] = [
  { threshold: 10, range: { min: 25, max: 50 } },
  { threshold: 25, range: { min: 50, max: 100 } },
  { threshold: 60, range: { min: 100, max: 180 } },
  { threshold: 120, range: { min: 150, max: 250 } },
  { threshold: Infinity, range: { min: 200, max: 400 } },
];

function countChineseChars(text: string): number {
  return (text.match(/[\u4e00-\u9fff]/g) ?? []).length;
}

function countEnglishWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

/**
 * 根据用户在对话中实际说的内容量，估算合适的日记目标字数范围。
 * 只统计 role === "user" 的消息。
 */
export function estimateDiaryLength(
  messages: { role: string; content: string }[],
  lang: "en" | "zh"
): LengthRange {
  const userText = messages
    .filter((m) => m.role === "user")
    .map((m) => m.content)
    .join(" ");

  const tiers = lang === "zh" ? ZH_TIERS : EN_TIERS;
  const volume =
    lang === "zh" ? countChineseChars(userText) : countEnglishWords(userText);

  for (const tier of tiers) {
    if (volume < tier.threshold) return tier.range;
  }
  return tiers[tiers.length - 1].range;
}
