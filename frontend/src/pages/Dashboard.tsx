import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import Header from "@/components/layout/Header";
import StatCards from "@/components/dashboard/StatCards";
import RiskChart from "@/components/dashboard/RiskChart";
import ActivityFeed from "@/components/dashboard/ActivityFeed";

export default function Dashboard() {
  const stats = useQuery({ queryKey: ["stats"], queryFn: api.stats, refetchInterval: 15_000 });
  const risk  = useQuery({ queryKey: ["risk-dist"], queryFn: api.riskDist, refetchInterval: 15_000 });
  const feed  = useQuery({ queryKey: ["activity"], queryFn: () => api.recentActivity(15), refetchInterval: 10_000 });
  const models = useQuery({ queryKey: ["model-stats"], queryFn: api.modelStats, refetchInterval: 30_000 });

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <Header title="Dashboard" subtitle="Zero-Trust AI Audit Overview" />

      <main className="flex-1 p-6 space-y-6">
        {/* Stats */}
        <StatCards stats={stats.data} loading={stats.isLoading} />

        {/* Charts + Model health */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <RiskChart data={risk.data} loading={risk.isLoading} />
          </div>

          {/* Model health panel */}
          <div className="card p-5">
            <h2 className="text-white text-sm font-semibold mb-4">Model Health</h2>
            {models.isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => <div key={i} className="shimmer h-10 rounded" />)}
              </div>
            ) : !models.data?.length ? (
              <p className="text-muted text-xs font-mono">No models registered yet.</p>
            ) : (
              <div className="space-y-3">
                {models.data.map((m) => (
                  <div key={m.name} className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${m.is_active ? "bg-green-400" : "bg-muted"}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-xs font-mono truncate">{m.name.split(":")[0]}</p>
                      <p className="text-muted text-[10px]">{m.total_calls} calls</p>
                    </div>
                    <span className="text-muted text-[11px] font-mono flex-shrink-0">
                      {m.avg_latency_ms > 0 ? `${Math.round(m.avg_latency_ms)}ms` : "—"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Activity feed */}
        <ActivityFeed data={feed.data} loading={feed.isLoading} />
      </main>
    </div>
  );
}
