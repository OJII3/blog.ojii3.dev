import {
  BG_COLORS,
  BORDER_COLORS,
  CODE_COLORS,
  type VitaColor,
} from "../constants";

export const getColorIndexByDate = (date: Date): number => {
  return date.getDate() % 7; // 0-6 for 7 colors
};

export const getBorderColorByDate = (date: Date): string => {
  const colorIndex = getColorIndexByDate(date);
  return BORDER_COLORS[colorIndex as VitaColor];
};

export const getBgColorByDate = (date: Date): string => {
  const colorIndex = getColorIndexByDate(date);
  return BG_COLORS[colorIndex as VitaColor];
};

export const getCodeColorByDate = (date: Date): string => {
  const colorIndex = getColorIndexByDate(date);
  return CODE_COLORS[colorIndex as VitaColor];
};
