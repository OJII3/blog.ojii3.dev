export const SITE_URL = "https://blog.ojii3.dev";
export const SITE_NAME = "晴れときどき崩壊ブログ";

export enum VitaColor {
  Red,
  Orange,
  Yellow,
  Green,
  Blue,
  Indigo,
  Violet,
}

export const BORDER_COLORS: Record<VitaColor, string> = {
  [VitaColor.Red]: "border-rose-500",
  [VitaColor.Orange]: "border-orange-500",
  [VitaColor.Yellow]: "border-yellow-500",
  [VitaColor.Green]: "border-lime-500",
  [VitaColor.Blue]: "border-emerald-500",
  [VitaColor.Indigo]: "border-indigo-500",
  [VitaColor.Violet]: "border-purple-500",
};

export const BG_COLORS: Record<VitaColor, string> = {
  [VitaColor.Red]: "bg-rose-500",
  [VitaColor.Orange]: "bg-orange-500",
  [VitaColor.Yellow]: "bg-yellow-500",
  [VitaColor.Green]: "bg-lime-500",
  [VitaColor.Blue]: "bg-emerald-500",
  [VitaColor.Indigo]: "bg-indigo-500",
  [VitaColor.Violet]: "bg-purple-500",
};
