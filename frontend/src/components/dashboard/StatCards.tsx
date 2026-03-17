import type { DashboardStats } from "@/lib/api";
import { formatMs } from "@/lib/utils";
import { Activity, ShieldAlert, Zap, Clock, XCircle, BarChart3 } from "lucide-react";

interface Props { stats: DashboardStats | undefined; loading: boolean }

const cards = (s: DashboardStats) => [
  {
    label: "Total Traces",
    value: s.total_traces.toLocaleString(),
    sub: `${s.traces_today} today`,
    icon: Activity,
    color: "text-accent",
    bg: "bg-accent/10",
  },
  {
    label: "Active Models",
    value: s.active_models,
    sub: "via Ollama",
    icon: Zap,
    color: "text-purple-400",
    bg: "bg-purple-500/10",
  },
  {
    label: "High Risk Flags",
    value: s.high_risk_count,
    sub: `${s.blocked_count} blocked`,
    icon: ShieldAlert,
    color: "text-red-400",
    bg: "bg-red-500/10",
  },
  {
    label: "Avg Latency",
    value: formatMs(s.avg_latency_ms),
    sub: "per request",
    icon: Clock,
    color: "text-yellow-400",
    bg: "bg-yellow-500/10",
  },
  {
    label: "Total Tokens",
    value: s.total_tokens.toLocaleString(),
    sub: "all time",
    icon: BarChart3,
    color: "text-green-400",
    bg: "bg-green-500/10",
  },
  {
    label: "Error Rate",
    value: `${(s.error_rate * 100).toFixed(1)}%`,
    sub: "last 24h",
    icon: XCircle,
    color: "text-orange-400",
    bg: "bg-orange-500/10",
  },
];

export default function StatCards({ stats, loading }: Props) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
      {loading || !stats
        ? Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card p-4">
              <div className="shimmer h-4 w-20 mb-3" />
              <div className="shimmer h-7 w-16 mb-2" />
              <div className="shimmer h-3 w-14" />
            </div>
          ))
        : cards(stats).map(({ label, value, sub, icon: Icon, color, bg }) => (
            <div key={label} className="card p-4 hover:border-accent/30 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <span className="text-muted text-xs font-mono">{label}</span>
                <div className={`w-6 h-6 rounded ${bg} flex items-center justify-center`}>
                  <Icon size={12} className={color} />
                </div>
              </div>
              <p className={`text-xl font-bold font-mono ${color}`}>{value}</p>
              <p className="text-muted text-[11px] mt-0.5">{sub}</p>
            </div>
          ))}
    </div>
  );
}
