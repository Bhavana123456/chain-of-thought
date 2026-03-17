import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Search, Filter, RefreshCw } from "lucide-react";
import { api } from "@/lib/api";
import { complianceBadge, complianceLabel, formatDate, formatMs, riskColor, truncate } from "@/lib/utils";
import Header from "@/components/layout/Header";
import AuditDrawer from "@/components/audit/AuditDrawer";

const PAGE_SIZE = 20;

export default function AuditLog() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [riskFilter, setRiskFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(
    searchParams.get("id")
  );

  useEffect(() => {
    if (searchParams.get("id")) {
      setSelectedId(searchParams.get("id"));
    }
  }, [searchParams]);

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["audit-list", search, riskFilter, statusFilter, page],
    queryFn: () =>
      api.auditList({
        q: search || undefined,
        risk_level: riskFilter || undefined,
        compliance_status: statusFilter || undefined,
        page,
        page_size: PAGE_SIZE,
      }),
    refetchInterval: 20_000,
  });

  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 1;

  const openDrawer = (id: string) => {
    setSelectedId(id);
    setSearchParams({ id });
  };
  const closeDrawer = () => {
    setSelectedId(null);
    setSearchParams({});
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <Header title="Audit Logs" subtitle={`${data?.total ?? "…"} total interactions`} />

      <main className="flex-1 p-6 space-y-4">
        {/* Filter bar */}
        <div className="card px-4 py-3 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            <Search size={14} className="text-muted flex-shrink-0" />
            <input
              className="input-field py-1.5"
              placeholder="Search prompts, models, users…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter size={13} className="text-muted" />
            <select
              className="input-field py-1.5 w-36"
              value={riskFilter}
              onChange={(e) => { setRiskFilter(e.target.value); setPage(1); }}
            >
              <option value="">All risk</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>

            <select
              className="input-field py-1.5 w-40"
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            >
              <option value="">All status</option>
              <option value="verified">Verified</option>
              <option value="needs_review">Needs Review</option>
              <option value="flagged">Flagged</option>
            </select>

            <button
              onClick={() => refetch()}
              className="btn-ghost p-1.5"
              title="Refresh"
            >
              <RefreshCw size={13} className={isFetching ? "animate-spin text-accent" : ""} />
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs font-mono">
              <thead>
                <tr className="border-b border-border bg-base/40">
                  <th className="text-left px-4 py-3 text-muted font-medium">Time</th>
                  <th className="text-left px-4 py-3 text-muted font-medium">Model</th>
                  <th className="text-left px-4 py-3 text-muted font-medium">Prompt</th>
                  <th className="text-left px-4 py-3 text-muted font-medium">Status</th>
                  <th className="text-left px-4 py-3 text-muted font-medium">Risk</th>
                  <th className="text-left px-4 py-3 text-muted font-medium">Latency</th>
                  <th className="text-left px-4 py-3 text-muted font-medium">Tokens</th>
                </tr>
              </thead>
              <tbody>
                {isLoading
                  ? Array.from({ length: 8 }).map((_, i) => (
                      <tr key={i} className="border-b border-border/50">
                        {Array.from({ length: 7 }).map((__, j) => (
                          <td key={j} className="px-4 py-3">
                            <div className="shimmer h-3 rounded w-full" />
                          </td>
                        ))}
                      </tr>
                    ))
                  : data?.items.map((log) => (
                      <tr
                        key={log.id}
                        onClick={() => openDrawer(log.id)}
                        className="border-b border-border/50 hover:bg-white/[0.02] cursor-pointer transition-colors group"
                      >
                        <td className="px-4 py-3 text-muted whitespace-nowrap">
                          {formatDate(log.created_at)}
                        </td>
                        <td className="px-4 py-3 text-white whitespace-nowrap">
                          {log.model.split(":")[0]}
                        </td>
                        <td className="px-4 py-3 text-white/60 group-hover:text-white/80 transition-colors max-w-xs">
                          <span className="truncate block">{truncate(log.prompt, 60)}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={complianceBadge(log.compliance_status)}>
                            {complianceLabel(log.compliance_status)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`font-bold ${riskColor(log.risk_score)}`}>
                            {(log.risk_score * 100).toFixed(0)}%
                          </span>
                        </td>
                        <td className="px-4 py-3 text-muted whitespace-nowrap">
                          {formatMs(log.latency_ms)}
                        </td>
                        <td className="px-4 py-3 text-muted">
                          {log.prompt_tokens + log.completion_tokens}
                        </td>
                      </tr>
                    ))}
              </tbody>
            </table>

            {!isLoading && !data?.items.length && (
              <div className="py-16 text-center text-muted font-mono text-sm">
                No audit logs found.
              </div>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border">
              <span className="text-muted text-xs font-mono">
                Page {page} of {totalPages} · {data?.total} total
              </span>
              <div className="flex gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="btn-ghost text-xs px-3 py-1 disabled:opacity-30"
                >
                  ← Prev
                </button>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="btn-ghost text-xs px-3 py-1 disabled:opacity-30"
                >
                  Next →
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {selectedId && <AuditDrawer id={selectedId} onClose={closeDrawer} />}
    </div>
  );
}
