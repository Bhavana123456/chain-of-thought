import type { RiskDistribution } from "@/lib/api";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Cell,
} from "recharts";

interface Props { data: RiskDistribution | undefined; loading: boolean }

const COLORS = { low: "#4ade80", medium: "#facc15", high: "#f87171" };

export default function RiskChart({ data, loading }: Props) {
  const chartData = data
    ? [
        { name: "Low",    value: data.low,    fill: COLORS.low },
        { name: "Medium", value: data.medium, fill: COLORS.medium },
        { name: "High",   value: data.high,   fill: COLORS.high },
      ]
    : [];

  const total = chartData.reduce((s, d) => s + d.value, 0) || 1;

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-white text-sm font-semibold">Risk Distribution</h2>
        <span className="text-muted text-xs font-mono">{total} total</span>
      </div>

      {loading ? (
        <div className="shimmer h-32 rounded" />
      ) : (
        <>
          <ResponsiveContainer width="100%" height={120}>
            <BarChart data={chartData} barSize={32}>
              <XAxis
                dataKey="name"
                tick={{ fill: "#8B949E", fontSize: 11, fontFamily: "monospace" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis hide />
              <Tooltip
                contentStyle={{
                  background: "#161B22",
                  border: "1px solid #30363D",
                  borderRadius: 6,
                  color: "#E6EDF3",
                  fontSize: 12,
                  fontFamily: "monospace",
                }}
                cursor={{ fill: "rgba(255,255,255,0.03)" }}
              />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {chartData.map((d) => (
                  <Cell key={d.name} fill={d.fill} fillOpacity={0.85} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          {/* Legend */}
          <div className="flex gap-4 mt-3">
            {chartData.map(({ name, value, fill }) => (
              <div key={name} className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ background: fill }} />
                <span className="text-muted text-xs font-mono">
                  {name}: <span className="text-white">{value}</span>{" "}
                  <span className="text-muted/60">({((value / total) * 100).toFixed(0)}%)</span>
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
