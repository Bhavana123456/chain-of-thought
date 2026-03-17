import { useNavigate } from "react-router-dom";
import type { RecentActivity } from "@/lib/api";
import { complianceBadge, complianceLabel, formatDate, formatMs, riskColor, truncate } from "@/lib/utils";

interface Props { data: RecentActivity[] | undefined; loading: boolean }

export default function ActivityFeed({ data, loading }: Props) {
  const navigate = useNavigate();

  return (
    <div className="card">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <h2 className="text-white text-sm font-semibold">Recent Activity</h2>
        <button
          onClick={() => navigate("/audit")}
          className="text-accent text-xs font-mono hover:underline"
        >
          View all →
        </button>
      </div>

      {loading ? (
        <div className="p-4 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-3">
              <div className="shimmer h-4 w-20" />
              <div className="shimmer h-4 flex-1" />
              <div className="shimmer h-4 w-14" />
            </div>
          ))}
        </div>
      ) : !data?.length ? (
        <div className="p-8 text-center text-muted text-sm font-mono">
          No activity yet. Start a chat to see logs here.
        </div>
      ) : (
        <div className="divide-y divide-border">
          {data.map((row) => (
            <button
              key={row.id}
              onClick={() => navigate(`/audit?id=${row.id}`)}
              className="w-full text-left px-5 py-3 hover:bg-white/[0.02] transition-colors group"
            >
              <div className="flex items-center gap-3">
                {/* Compliance badge */}
                <span className={complianceBadge(row.compliance_status)}>
                  {complianceLabel(row.compliance_status)}
                </span>

                {/* Prompt preview */}
                <span className="flex-1 text-white/70 text-xs font-mono truncate group-hover:text-white transition-colors">
                  {truncate(row.prompt_preview, 60)}
                </span>

                {/* Model */}
                <span className="text-muted text-[11px] font-mono hidden sm:block">
                  {row.model.split(":")[0]}
                </span>

                {/* Risk score */}
                <span className={`text-xs font-mono font-bold ${riskColor(row.risk_score)}`}>
                  {(row.risk_score * 100).toFixed(0)}%
                </span>

                {/* Latency */}
                <span className="text-muted text-[11px] font-mono hidden md:block w-14 text-right">
                  {formatMs(row.latency_ms)}
                </span>

                {/* Time */}
                <span className="text-muted text-[11px] font-mono hidden lg:block w-32 text-right">
                  {formatDate(row.created_at)}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
