"use client";

import {
	CartesianGrid,
	Line,
	LineChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import { formatCurrency } from "@/lib/utils/formatters";

type SalesTrendPoint = { month: string; count: number; value: number };

export function SalesTrendLineChart({
	data,
	granularity = "month",
}: {
	data: SalesTrendPoint[];
	granularity?: "week" | "month";
}) {
	const values = data.map((d) => Number(d.value ?? 0));
	const min = values.length ? Math.min(...values) : 0;
	const max = values.length ? Math.max(...values) : 0;
	const pad = (max - min) * 0.1;
	const yMin = Math.floor(min - pad);
	const yMax = Math.ceil(max + pad);
	const domain: [number, number] =
		max === min ? [0, max === 0 ? 1 : max * 1.2] : [yMin, yMax];

	return (
		<div className="w-full" style={{ height: 260 }}>
			<ResponsiveContainer width="100%" height="100%">
				<LineChart
					data={data}
					margin={{ top: 8, right: 16, bottom: 0, left: 8 }}
				>
					<CartesianGrid strokeDasharray="3 3" />
					<XAxis
						dataKey="month"
						tick={{ fontSize: 12 }}
						tickFormatter={(v: any) => {
							const s = String(v ?? "");
							if (granularity === "week" && s.includes("-W")) {
								const parts = s.split("-W");
								return `W${parts[1] ?? ""}`;
							}
							return s;
						}}
					/>
					<YAxis
						domain={domain}
						tickFormatter={(v) =>
							formatCurrency(Number(v))
						}
					/>
					<Tooltip
						formatter={(v: any) => formatCurrency(Number(v))}
						labelFormatter={(label: any) => {
							const s = String(label ?? "");
							if (granularity === "week" && s.includes("-W")) {
								const parts = s.split("-W");
								return `Week: W${parts[1] ?? ""}`;
							}
							return `Month: ${s}`;
						}}
					/>
					<Line
						type="monotone"
						dataKey="value"
						stroke="#16a34a"
						strokeWidth={2}
						dot={false}
					/>
				</LineChart>
			</ResponsiveContainer>
		</div>
	);
}

