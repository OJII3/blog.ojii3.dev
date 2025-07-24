import type { FC } from "react";
import wordmark from "../assets/wordmark-for-og.svg?inline";
import { getColorIndexByDate } from "../lib/colors";

type Props = {
  title: string;
  date: Date;
};

const colors = [
  "#FF2056",
  "#FF6900",
  "#FFBC00",
  "#7CCF00",
  "#00BC7D",
  "#615FFF",
  "#AD46FF",
];

export const OGImage: FC<Props> = async ({ title, date }) => {
  const index = getColorIndexByDate(date);
  return (
    <div
      lang="ja-JP"
      style={{
        width: "100%",
        height: "100%",
        color: "#333",
        backgroundColor: "#fff",
        padding: "64px 160px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        fontFamily: "M PLUS Rounded 1c",
        fontWeight: "bold",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "20px",
          overflow: "hidden",
        }}
      >
        <img src={wordmark} alt="" width={352} />
        <div
          style={{
            fontSize: "64px",
            WebkitLineClamp: 3,
            textOverflow: "ellipsis",
          }}
        >
          {title}
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        <span style={{ fontSize: "32px", textAlign: "end" }}>by OJII3</span>
        <div style={{ display: "flex", gap: "12px" }}>
          {colors.map((color, i) => (
            <div
              key={color}
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "50px",
                backgroundColor: color,
                flex: "0 0 32px",
                flexGrow: i === index ? 1 : 0,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
