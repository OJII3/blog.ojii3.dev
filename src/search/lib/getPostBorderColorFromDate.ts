import { BORDER_COLORS, type VitaColor } from "@/shared/constants";

export const getPostBorderColorFromDate = (dateString: string): string => {
	const dateNumber = new Date(dateString).getDate();
	const colorIndex: VitaColor = dateNumber % 7;

	return BORDER_COLORS[colorIndex];
};
