"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatAxisK, formatMoney, getCountTicks, getNiceTicks } from "@/lib/format";
import SectionHeading from "@/components/SectionHeading";

type BarChartCardProps = {
  title: string;
  // One bar per item, for example { label: "Oct", value: 1200 }.
  data: { label: string; value: number }[];
  // "blue" or "purple" picks the panel and bar colors from the screenshot.
  tone: "blue" | "purple";
  // "money" (default) shows $ amounts. "count" shows whole numbers, such as
  // the number of transactions per day.
  valueType?: "money" | "count";
};

const tones = {
  blue: { panel: "bg-chart-blue-panel", bar: "#b5dbf0" },
  purple: { panel: "bg-chart-purple-panel", bar: "#c5b5e8" },
};

const GREY = "#6b6b78";

// A heading plus a pastel panel with a flat bar chart:
// white horizontal grid lines, no axis lines, Y labels like 1K, 2K.
export default function BarChartCard({
  title,
  data,
  tone,
  valueType = "money",
}: BarChartCardProps) {
  const colors = tones[tone];

  // Tidy Y axis values (0, 1K, 2K ...) based on the biggest bar.
  const biggest = Math.max(0, ...data.map((item) => item.value));
  const ticks = valueType === "count" ? getCountTicks(biggest) : getNiceTicks(biggest);
  const top = ticks[ticks.length - 1];

  return (
    <section className="min-w-0">
      <SectionHeading>{title}</SectionHeading>

      <div className={`mt-6 rounded-xl px-3 py-5 ${colors.panel}`}>
        <ResponsiveContainer width="100%" height={210}>
          <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="#ffffff" />
            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: GREY }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              width={36}
              ticks={ticks}
              domain={[0, top]}
              interval={0}
              tickFormatter={formatAxisK}
              tick={{ fontSize: 11, fill: GREY }}
            />
            {/* Hover or tap a bar to see the exact amount, for example $1,200.00 */}
            <Tooltip
              cursor={false}
              formatter={(value) =>
                valueType === "count" ? String(value) : formatMoney(Number(value))
              }
            />
            <Bar
              dataKey="value"
              name={valueType === "count" ? "Transactions" : "Total"}
              fill={colors.bar}
              barSize={20}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}