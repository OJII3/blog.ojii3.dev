import type { VitaColor } from "../constants";

export const getColorIndex = (date: Date): VitaColor => {
	return (date.getDate() % 7) as VitaColor;
};
