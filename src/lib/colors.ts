import { BG_COLORS, BORDER_COLORS } from "../constants";

export const getBorderColorByDate = (date: Date): string => {
  const colorIndex = date.getDate() % 7; // 0-6 for 7 colors
  return BORDER_COLORS[colorIndex];
};
export const getBgColorByDate = (date: Date): string => {
  const colorIndex = date.getDate() % 7; // 0-6 for 7 colors
  return BG_COLORS[colorIndex];
};
export const getColorIndexByDate = (date: Date): number => {
  return date.getDate() % 7; // 0-6 for 7 colors
}
