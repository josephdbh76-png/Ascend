"use client";

import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { formatCurrency } from "@/lib/utils";
import type { RevenuePoint } from "@/types";

export function PerformanceChart({ data }: { data: RevenuePoint[] }) {
  const chartData = data.map((d) => ({
    month: new Date(d.period).toLocaleDateString("fr-FR", { month: "short" }),
    revenue: d.amountCents,
    verified: d.isVerified,
  }));

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-gold)" stopOpacity={0.3} />
              <stop offset="100%" stopColor="var(--color-gold)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="var(--color-border)" vertical={false} />
          <XAxis
            dataKey="month"
            stroke="var(--color-border-strong)"
            tick={{ fill: "var(--color-text-muted)", fontSize: 11, fontFamily: "var(--font-mono)" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis hide domain={["dataMin - dataMin * 0.1", "dataMax + dataMax * 0.1"]} />
          <Tooltip
            contentStyle={{
              background: "var(--color-card-elevated)",
              border: "1px solid var(--color-border-strong)",
              borderRadius: 0,
              fontSize: 12,
              fontFamily: "var(--font-mono)",
            }}
            labelStyle={{ color: "var(--color-text-secondary)" }}
            formatter={(value) => [formatCurrency(Number(value)), "Revenus"]}
          />
          <Area
            type="monotone"
            dataKey="revenue"
            stroke="var(--color-gold)"
            strokeWidth={2}
            fill="url(#revenueFill)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
