"use client";

import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import type { TooltipContentProps } from "recharts";
import { ShieldCheck } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { RevenuePoint } from "@/types";

interface ChartPoint {
  month: string;
  fullLabel: string;
  revenue: number;
  verified: boolean;
  transactionCount: number | null;
  customerCount: number | null;
}

function MonthTooltip({ active, payload }: TooltipContentProps) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload as ChartPoint;

  return (
    <div className="rounded-lg border border-[#293548] bg-[#111925] px-3 py-2 text-xs">
      <div className="flex items-center gap-1.5 text-[#a8b1bf]">
        <span className="capitalize">{point.fullLabel}</span>
        {point.verified && <ShieldCheck className="h-3 w-3 text-success" />}
      </div>
      <p className="mt-1 text-sm font-semibold text-text-primary">{formatCurrency(point.revenue)}</p>
      {(point.transactionCount != null || point.customerCount != null) && (
        <p className="mt-1 text-[#a8b1bf]">
          {point.transactionCount != null &&
            `${point.transactionCount} transaction${point.transactionCount > 1 ? "s" : ""}`}
          {point.transactionCount != null && point.customerCount != null && " · "}
          {point.customerCount != null && `${point.customerCount} client${point.customerCount > 1 ? "s" : ""}`}
        </p>
      )}
    </div>
  );
}

export function PerformanceChart({ data }: { data: RevenuePoint[] }) {
  const chartData: ChartPoint[] = data.map((d) => ({
    month: new Date(d.period).toLocaleDateString("fr-FR", { month: "short" }),
    fullLabel: new Date(d.period).toLocaleDateString("fr-FR", { month: "long", year: "numeric" }),
    revenue: d.amountCents,
    verified: d.isVerified,
    transactionCount: d.transactionCount,
    customerCount: d.customerCount,
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
          <Tooltip content={MonthTooltip} />
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
