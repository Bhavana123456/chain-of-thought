import { useQuery } from "@tanstack/react-query";
import { X, Copy, Check, ExternalLink } from "lucide-react";
import { useState } from "react";
import { api } from "@/lib/api";
import { complianceBadge, complianceLabel, formatDate, formatMs, riskColor, shortHash } from "@/lib/utils";
import ChainTimeline from "./ChainTimeline";

interface Props { id: string; onClose: () => void }

export default function AuditDrawer({ id, onClose }: Props) {
  const { data: log, isLoading } = useQuery({
    queryKey: ["audit", id],
    queryFn: () => api.auditGet(id),
  });

  const [copied, setCopied] = useState(false);

  const copyProof = () => {
    if (!log) return;
    const proof = `ChainOfThought Audit Proof\nID: ${log.id}\nChecksum: ${log.checksum}\nModel: ${log.model}\nTime: ${log.created_at}`;
    navigator.clipboard.writeText(proof);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-full max-w-2xl bg-card border-l border-border z-50 flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
          <div>
            <p className="text-white font-semibold text-sm">Audit Detail</p>
            {log && (
              <p className="text-muted text-xs font-mono mt-0.5">{log.id}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={copyProof}
              className="flex items-center gap-1.5 btn-ghost"
              title="Copy proof link"
            >
              {copied ? <Check size={13} className="text-green-400" /> : <Copy size={13} />}
              <span className="text-xs">{copied ? "Copied!" : "Copy Proof"}</span>
            </button>
            <button onClick={onClose} className="btn-ghost p-1.5">
              <X size={16} />
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex-1 p-6 space-y-4">
            {[1, 2, 3, 4].map((i) => <div key={i} className="shimmer h-20 rounded" />)}
          </div>
        ) : !log ? (
          <div className="flex-1 flex items-center justify-center text-muted text-sm font-mono">
            Log not found.
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            {/* Metadata panel */}
            <div className="px-6 py-4 border-b border-border bg-base/40">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <p className="text-muted text-[10px] font-mono uppercase mb-1">Status</p>
                  <span className={complianceBadge(log.compliance_status)}>
                    {complianceLabel(log.compliance_status)}
                  </span>
                </div>
                <div>
                  <p className="text-muted text-[10px] font-mono uppercase mb-1">Risk Score</p>
                  <p className={`text-sm font-mono font-bold ${riskColor(log.risk_score)}`}>
                    {(log.risk_score * 100).toFixed(1)}%
                  </p>
                </div>
                <div>
                  <p className="text-muted text-[10px] font-mono uppercase mb-1">Latency</p>
                  <p className="text-white text-sm font-mono">{formatMs(log.latency_ms)}</p>
                </div>
                <div>
                  <p className="text-muted text-[10px] font-mono uppercase mb-1">Tokens</p>
                  <p className="text-white text-sm font-mono">
                    {log.prompt_tokens + log.completion_tokens}
                  </p>
                </div>
                <div>
                  <p className="text-muted text-[10px] font-mono uppercase mb-1">Model</p>
                  <p className="text-white text-xs font-mono truncate">{log.model}</p>
                </div>
                <div>
                  <p className="text-muted text-[10px] font-mono uppercase mb-1">Time</p>
                  <p className="text-white text-xs font-mono">{formatDate(log.created_at)}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-muted text-[10px] font-mono uppercase mb-1">
                    SHA-256 Checksum
                  </p>
                  <div className="flex items-center gap-1.5">
                    <p className="text-accent text-xs font-mono">{shortHash(log.checksum)}</p>
                    {log.checksum && (
                      <button
                        onClick={() => navigator.clipboard.writeText(log.checksum!)}
                        className="text-muted hover:text-white transition-colors"
                        title="Copy full checksum"
                      >
                        <Copy size={11} />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Risk flags */}
              {log.risk_flags.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {log.risk_flags.map((flag) => (
                    <span key={flag} className="badge-flagged">{flag}</span>
                  ))}
                </div>
              )}
            </div>

            {/* Chain timeline */}
            <div className="px-6 py-5">
              <p className="text-white text-xs font-mono font-semibold mb-4 uppercase tracking-wider">
                Chain of Thought
              </p>
              <ChainTimeline log={log} />
            </div>

            {/* Trace link */}
            {log.trace_id && (
              <div className="px-6 pb-5">
                <a
                  href={`https://cloud.langfuse.com/trace/${log.trace_id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 text-accent text-xs font-mono hover:underline"
                >
                  <ExternalLink size={12} />
                  View in Langfuse: {log.trace_id.slice(0, 16)}…
                </a>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
