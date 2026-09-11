"use client";

import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { formatCurrency } from "@/lib/utils";
import type { RevenuePoint } from "@/types";

export function PerformanceChart({ data }: { data: RevenuePoint[] }) {
  const chartData = data.map((d) => ({
    month: new Date(d.period).toLocaleDateString("en-US", { month: "short" }),
    revenue: d.amountCents,
    verified: d.isVerified,
  }));

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f5c451" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#f5c451" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#1c2635" vertical={false} />
          <XAxis
            dataKey="month"
            stroke="#687386"
            tick={{ fill: "#687386", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis hide domain={["dataMin - dataMin * 0.1", "dataMax + dataMax * 0.1"]} />
          <Tooltip
            contentStyle={{
              background: "#111925",
              border: "1px solid #293548",
              borderRadius: 8,
              fontSize: 12,
            }}
            labelStyle={{ color: "#a8b1bf" }}
            formatter={(value) => [formatCurrency(Number(value)), "Revenue"]}
          />
          <Area
            type="monotone"
            dataKey="revenue"
            stroke="#f5c451"
            strokeWidth={2}
            fill="url(#revenueFill)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
