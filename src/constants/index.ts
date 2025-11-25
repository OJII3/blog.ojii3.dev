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

export const TEXT_COLORS: Record<VitaColor, string> = {
	[VitaColor.Red]: "text-rose-500",
	[VitaColor.Orange]: "text-orange-500",
	[VitaColor.Yellow]: "text-yellow-500",
	[VitaColor.Green]: "text-lime-500",
	[VitaColor.Blue]: "text-emerald-500",
	[VitaColor.Indigo]: "text-indigo-500",
	[VitaColor.Violet]: "text-purple-500",
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

export const H2_BORDER_COLORS: Record<VitaColor, string> = {
	[VitaColor.Red]: "prose-h2:border-rose-500",
	[VitaColor.Orange]: "prose-h2:border-orange-500",
	[VitaColor.Yellow]: "prose-h2:border-yellow-500",
	[VitaColor.Green]: "prose-h2:border-lime-500",
	[VitaColor.Blue]: "prose-h2:border-emerald-500",
	[VitaColor.Indigo]: "prose-h2:border-indigo-500",
	[VitaColor.Violet]: "prose-h2:border-purple-500",
};
