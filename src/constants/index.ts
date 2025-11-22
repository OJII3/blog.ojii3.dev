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

export const HEX_COLORS: Record<VitaColor, string> = {
	[VitaColor.Red]: "#FF2056",
	[VitaColor.Orange]: "#FF6900",
	[VitaColor.Yellow]: "#FFBC00",
	[VitaColor.Green]: "#7CCF00",
	[VitaColor.Blue]: "#00BC7D",
	[VitaColor.Indigo]: "#615FFF",
	[VitaColor.Violet]: "#AD46FF",
};

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

export const CODE_COLORS: Record<VitaColor, string> = {
	[VitaColor.Red]: "prose-code:bg-rose-100 dark:prose-code:bg-rose-800",
	[VitaColor.Orange]: "prose-code:bg-orange-100 dark:prose-code:bg-orange-800",
	[VitaColor.Yellow]: "prose-code:bg-yellow-100 dark:prose-code:bg-yellow-800",
	[VitaColor.Green]: "prose-code:bg-lime-100 dark:prose-code:bg-lime-800",
	[VitaColor.Blue]: "prose-code:bg-emerald-100 dark:prose-code:bg-emerald-800",
	[VitaColor.Indigo]: "prose-code:bg-indigo-100 dark:prose-code:bg-indigo-800",
	[VitaColor.Violet]: "prose-code:bg-purple-100 dark:prose-code:bg-purple-800",
};
