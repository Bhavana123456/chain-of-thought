import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  FileDown, ShieldCheck, FileText, BarChart3,
  CheckCircle, Clock, AlertTriangle,
} from "lucide-react";
import { api } from "@/lib/api";
import { formatMs } from "@/lib/utils";
import Header from "@/components/layout/Header";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis,
} from "recharts";

const COLORS = { low: "#4ade80", medium: "#facc15", high: "#f87171" };

export default function Reports() {
  const [generating, setGenerating] = useState<string | null>(null);
  const [generated, setGenerated] = useState<string[]>([]);

  const stats  = useQuery({ queryKey: ["stats"], queryFn: api.stats });
  const risk   = useQuery({ queryKey: ["risk-dist"], queryFn: api.riskDist });
  const models = useQuery({ queryKey: ["model-stats"], queryFn: api.modelStats });

  const totalRisk = risk.data
    ? risk.data.low + risk.data.medium + risk.data.high
    : 0;

  const complianceScore =
    totalRisk > 0 && risk.data
      ? Math.round(((risk.data.low + risk.data.medium * 0.5) / totalRisk) * 100)
      : 100;

  const riskPieData = risk.data
    ? [
        { name: "Low",    value: risk.data.low,    fill: COLORS.low },
        { name: "Medium", value: risk.data.medium, fill: COLORS.medium },
        { name: "High",   value: risk.data.high,   fill: COLORS.high },
      ]
    : [];

  const modelBarData = (models.data ?? []).map((m) => ({
    name: m.name.split(":")[0].slice(0, 10),
    calls: m.total_calls,
    latency: Math.round(m.avg_latency_ms),
  }));

  const handleGenerate = (type: string) => {
    setGenerating(type);
    setTimeout(() => {
      setGenerating(null);
      setGenerated((prev) => [...prev, type]);
    }, 1800);
  };

  const reports = [
    {
      id: "EU_AI_ACT",
      icon: ShieldCheck,
      color: "text-accent",
      bg: "bg-accent/10 border-accent/20",
      title: "EU AI Act — Annex IV",
      desc: "Full compliance audit pack required under Article 11. Includes risk classification, transparency docs, and interaction logs.",
      badge: "Regulatory",
    },
    {
      id: "MONTHLY",
      icon: BarChart3,
      color: "text-purple-400",
      bg: "bg-purple-500/10 border-purple-500/20",
      title: "Monthly Summary",
      desc: "Usage statistics, risk trends, model performance, and flagged interaction summary for the current month.",
      badge: "Analytics",
    },
    {
      id: "SECURITY",
      icon: AlertTriangle,
      color: "text-red-400",
      bg: "bg-red-500/10 border-red-500/20",
      title: "Security Incident Report",
      desc: "All flagged and blocked interactions with full chain-of-thought traces for security review.",
      badge: "Security",
    },
    {
      id: "FULL_AUDIT",
      icon: FileText,
      color: "text-green-400",
      bg: "bg-green-500/10 border-green-500/20",
      title: "Full Audit Export",
      desc: "Complete raw export of all interactions with checksums, metadata, and model details in JSON format.",
      badge: "Export",
    },
  ];

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <Header title="Compliance Reports" subtitle="Generate and export audit packs" />

      <main className="flex-1 p-6 space-y-6">
        {/* Compliance score + quick stats */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Score card */}
          <div className="card p-5 flex items-center gap-5">
            <div className="relative w-16 h-16 flex-shrink-0">
              <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
                <circle cx="32" cy="32" r="26" fill="none" stroke="#30363D" strokeWidth="6" />
                <circle
                  cx="32" cy="32" r="26" fill="none"
                  stroke={complianceScore >= 80 ? "#4ade80" : complianceScore >= 50 ? "#facc15" : "#f87171"}
                  strokeWidth="6"
                  strokeDasharray={`${2 * Math.PI * 26}`}
                  strokeDashoffset={`${2 * Math.PI * 26 * (1 - complianceScore / 100)}`}
                  strokeLinecap="round"
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-white text-sm font-bold font-mono">
                {complianceScore}%
              </span>
            </div>
            <div>
              <p className="text-white text-sm font-semibold">Compliance Score</p>
              <p className="text-muted text-xs mt-0.5">Based on risk distribution</p>
              <p className={`text-xs font-mono mt-1 ${
                complianceScore >= 80 ? "text-green-400" : complianceScore >= 50 ? "text-yellow-400" : "text-red-400"
              }`}>
                {complianceScore >= 80 ? "Compliant" : complianceScore >= 50 ? "Needs Review" : "Non-Compliant"}
              </p>
            </div>
          </div>

          {[
            { label: "Total Logs", value: stats.data?.total_traces ?? "…", icon: FileText, color: "text-accent" },
            { label: "High Risk",  value: stats.data?.high_risk_count ?? "…", icon: AlertTriangle, color: "text-red-400" },
            { label: "Avg Latency", value: stats.data ? formatMs(stats.data.avg_latency_ms) : "…", icon: Clock, color: "text-yellow-400" },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="card p-5 flex items-center gap-4">
              <Icon size={20} className={`${color} flex-shrink-0`} />
              <div>
                <p className="text-muted text-xs font-mono">{label}</p>
                <p className={`text-2xl font-bold font-mono mt-0.5 ${color}`}>{value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Risk pie */}
          <div className="card p-5">
            <h2 className="text-white text-sm font-semibold mb-4">Risk Breakdown</h2>
            {risk.isLoading ? (
              <div className="shimmer h-40 rounded" />
            ) : (
              <div className="flex items-center gap-6">
                <ResponsiveContainer width={140} height={140}>
                  <PieChart>
                    <Pie data={riskPieData} dataKey="value" innerRadius={40} outerRadius={65} paddingAngle={3}>
                      {riskPieData.map((d) => (
                        <Cell key={d.name} fill={d.fill} fillOpacity={0.85} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: "#161B22", border: "1px solid #30363D", borderRadius: 6, fontSize: 12, fontFamily: "monospace" }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2">
                  {riskPieData.map(({ name, value, fill }) => (
                    <div key={name} className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: fill }} />
                      <span className="text-muted text-xs font-mono">
                        {name}: <span className="text-white">{value}</span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Model usage bar */}
          <div className="card p-5">
            <h2 className="text-white text-sm font-semibold mb-4">Model Usage</h2>
            {models.isLoading ? (
              <div className="shimmer h-40 rounded" />
            ) : !modelBarData.length ? (
              <p className="text-muted text-xs font-mono">No model data yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={140}>
                <BarChart data={modelBarData} barSize={20}>
                  <XAxis dataKey="name" tick={{ fill: "#8B949E", fontSize: 10, fontFamily: "monospace" }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip contentStyle={{ background: "#161B22", border: "1px solid #30363D", borderRadius: 6, fontSize: 12, fontFamily: "monospace" }} />
                  <Bar dataKey="calls" fill="#58A6FF" fillOpacity={0.8} radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Report cards */}
        <div>
          <h2 className="text-white text-sm font-semibold mb-4">Generate Audit Packs</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {reports.map(({ id, icon: Icon, color, bg, title, desc, badge }) => {
              const isDone = generated.includes(id);
              const isLoading = generating === id;
              return (
                <div key={id} className={`card p-5 border ${bg}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${bg}`}>
                        <Icon size={16} className={color} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-white text-sm font-semibold">{title}</p>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-border text-muted">{badge}</span>
                        </div>
                        <p className="text-muted text-xs leading-relaxed">{desc}</p>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => !isDone && !isLoading && handleGenerate(id)}
                    disabled={isLoading}
                    className={`mt-4 w-full flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-colors border ${
                      isDone
                        ? "border-green-500/30 bg-green-500/10 text-green-400"
                        : isLoading
                        ? "border-border bg-white/5 text-muted cursor-wait"
                        : `border-border hover:border-accent/40 hover:bg-accent/5 text-white`
                    }`}
                  >
                    {isDone ? (
                      <><CheckCircle size={14} /> Export Ready</>
                    ) : isLoading ? (
                      <><span className="w-3 h-3 border-2 border-muted/40 border-t-accent rounded-full animate-spin" /> Generating…</>
                    ) : (
                      <><FileDown size={14} /> Generate Report</>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}
