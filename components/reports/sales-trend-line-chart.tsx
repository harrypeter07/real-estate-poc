"use client";

import {
	CartesianGrid,
	Area,
	AreaChart,
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
		<div className="w-full relative" style={{ height: 220 }}>
			<ResponsiveContainer width="100%" height="100%">
				<AreaChart
					data={data}
					margin={{ top: 12, right: 5, bottom: 0, left: -5 }}
				>
					<defs>
						<linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
							<stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
							<stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
						</linearGradient>
					</defs>
					<CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" vertical={false} />
					<XAxis
						dataKey="month"
						tick={{ fontSize: 9, fill: "#71717a" }}
						tickLine={false}
						axisLine={{ stroke: "#e4e4e7" }}
						dy={5}
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
						width={40}
						tick={{ fontSize: 9, fill: "#71717a" }}
						tickLine={false}
						axisLine={false}
						tickFormatter={(v) =>
							formatCurrency(Number(v))
						}
					/>
					<Tooltip
						contentStyle={{
							backgroundColor: "rgba(255, 255, 255, 0.98)",
							borderRadius: "12px",
							border: "1px solid #e4e4e7",
							boxShadow: "0 4px 12px rgba(0, 0, 0, 0.05)",
							fontSize: "11px",
							fontWeight: "bold",
						}}
						formatter={(v: any) => [formatCurrency(Number(v)), "Sales Value"]}
						labelFormatter={(label: any) => {
							const s = String(label ?? "");
							if (granularity === "week" && s.includes("-W")) {
								const parts = s.split("-W");
								return `Week: W${parts[1] ?? ""}`;
							}
							return `Month: ${s}`;
						}}
					/>
					<Area
						type="monotone"
						dataKey="value"
						stroke="#10b981"
						strokeWidth={2}
						fillOpacity={1}
						fill="url(#colorSales)"
						dot={data.length === 1 ? { r: 5, stroke: "#10b981", strokeWidth: 2, fill: "#ffffff" } : { r: 3, stroke: "#10b981", strokeWidth: 1.5, fill: "#ffffff" }}
						activeDot={{ r: 5, stroke: "#10b981", strokeWidth: 2, fill: "#ffffff" }}
					/>
				</AreaChart>
			</ResponsiveContainer>
		</div>
	);
}

