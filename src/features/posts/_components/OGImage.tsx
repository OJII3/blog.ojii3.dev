import type { FC } from "react";
import wordmark from "../../../assets/wordmark-for-og.svg?inline";
import { HEX_COLORS, type VitaColor } from "../../../constants";

type Props = {
	title: string;
	date: Date;
	color: VitaColor;
};

export const OGImage: FC<Props> = async ({ title, color }) => {
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
					{Object.values(HEX_COLORS).map((value, i) => (
						<div
							key={color}
							style={{
								width: "32px",
								height: "32px",
								borderRadius: "50px",
								backgroundColor: value,
								flex: "0 0 32px",
								flexGrow: i === color ? 1 : 0,
							}}
						/>
					))}
				</div>
			</div>
		</div>
	);
};
