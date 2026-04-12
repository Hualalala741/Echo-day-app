export type MoodInfo = {
  label: string;
  icon: string;
  colorHex: string;
};

const MOODS = {
  angry:     { label: "Angry",      icon: "/moods/angry.svg",      colorHex: "#E46A6A" },
  surprised: { label: "Surprised",  icon: "/moods/surprised.svg",  colorHex: "#E7A15A" },
  excited:   { label: "Excited",    icon: "/moods/excited.svg",    colorHex: "#E5C85E" },
  sad:       { label: "Sad",        icon: "/moods/sad.svg",        colorHex: "#6F86B6" },
  neutral:   { label: "Neutral",    icon: "/moods/neutral.svg",    colorHex: "#B8C2C1" },
  happy:     { label: "Happy",      icon: "/moods/happy.svg",      colorHex: "#58C987" },
  depressed: { label: "Depressed",  icon: "/moods/depressed.svg",  colorHex: "#BCA3C9" },
  tired:     { label: "Tired",      icon: "/moods/tired.svg",      colorHex: "#7E8E9D" },
  calm:      { label: "Calm",       icon: "/moods/calm.svg",       colorHex: "#5DB9AE" },
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

export type MoodKey = keyof typeof MOODS;

export function getMood(valence: number, arousal: number): MoodInfo & { key: MoodKey } {
  const vIdx = valence < 0.33 ? 0 : valence < 0.66 ? 1 : 2;
  const aIdx = arousal >= 0.66 ? 0 : arousal >= 0.33 ? 1 : 2;
  const info = GRID[aIdx][vIdx];
  const key = (Object.keys(MOODS) as MoodKey[]).find(
    (k) => MOODS[k] === info,
  )!;
  return { ...info, key };
}

export { MOODS };
