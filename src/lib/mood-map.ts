export type MoodInfo = {
  label: string;
  emoji: string;
  colorHex: string;
};

const MOODS = {
  angry:     { label: "愤怒", emoji: "😠", colorHex: "#ef4444" },
  surprised: { label: "惊讶", emoji: "😲", colorHex: "#f97316" },
  excited:   { label: "兴奋", emoji: "🤩", colorHex: "#eab308" },
  sad:       { label: "悲伤", emoji: "😢", colorHex: "#6366f1" },
  neutral:   { label: "平淡", emoji: "😐", colorHex: "#94a3b8" },
  happy:     { label: "愉悦", emoji: "😊", colorHex: "#22c55e" },
  depressed: { label: "低落", emoji: "😔", colorHex: "#8b5cf6" },
  tired:     { label: "疲惫", emoji: "😴", colorHex: "#64748b" },
  calm:      { label: "平静", emoji: "😌", colorHex: "#14b8a6" },
} satisfies Record<string, MoodInfo>;

// valence (0-1, neg→pos) × arousal (0-1, calm→excited) → 3×3 grid
const GRID: MoodInfo[][] = [
  // arousal: high (0.66-1)
  [MOODS.angry,     MOODS.surprised, MOODS.excited],
  // arousal: mid  (0.33-0.66)
  [MOODS.sad,       MOODS.neutral,   MOODS.happy],
  // arousal: low  (0-0.33)
  [MOODS.depressed, MOODS.tired,     MOODS.calm],
];

export function getMood(valence: number, arousal: number): MoodInfo {
  const vIdx = valence < 0.33 ? 0 : valence < 0.66 ? 1 : 2;
  const aIdx = arousal >= 0.66 ? 0 : arousal >= 0.33 ? 1 : 2;
  return GRID[aIdx][vIdx];
}

export { MOODS };
