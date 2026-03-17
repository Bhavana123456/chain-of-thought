import type { AuditLog } from "@/lib/api";
import { MessageSquare, Brain, Cpu, CheckCircle } from "lucide-react";

interface Props { log: AuditLog }

const steps = (log: AuditLog) => [
  {
    icon: MessageSquare,
    label: "Input Prompt",
    color: "text-accent border-accent/30 bg-accent/10",
    dot: "bg-accent",
    content: <pre className="text-white/80 text-xs font-mono whitespace-pre-wrap break-words">{log.prompt}</pre>,
  },
  ...(log.rag_context?.length
    ? [{
        icon: Brain,
        label: "Retrieved Context (RAG)",
        color: "text-purple-400 border-purple-500/30 bg-purple-500/10",
        dot: "bg-purple-400",
        content: (
          <div className="space-y-2">
            {(log.rag_context as string[]).map((chunk, i) => (
              <div key={i} className="text-white/70 text-xs font-mono bg-base/50 rounded p-2 border border-border">
                <span className="text-muted/60 mr-2">[{i + 1}]</span>{chunk}
              </div>
            ))}
          </div>
        ),
      }]
    : []),
  ...(log.thought_chain?.length
    ? [{
        icon: Cpu,
        label: "Model Reasoning",
        color: "text-yellow-400 border-yellow-500/30 bg-yellow-500/10",
        dot: "bg-yellow-400",
        content: (
          <ol className="space-y-1 list-decimal list-inside">
            {(log.thought_chain as string[]).map((step, i) => (
              <li key={i} className="text-white/70 text-xs font-mono">{step}</li>
            ))}
          </ol>
        ),
      }]
    : []),
  {
    icon: CheckCircle,
    label: "Final Response",
    color: "text-green-400 border-green-500/30 bg-green-500/10",
    dot: "bg-green-400",
    content: (
      <pre className="text-white/80 text-xs font-mono whitespace-pre-wrap break-words">
        {log.response ?? "No response recorded."}
      </pre>
    ),
  },
];

export default function ChainTimeline({ log }: Props) {
  const items = steps(log);
  return (
    <div className="space-y-0">
      {items.map(({ icon: Icon, label, color, content }, idx) => (
        <div key={label} className="flex gap-4">
          {/* Vertical connector */}
          <div className="flex flex-col items-center">
            <div className={`w-7 h-7 rounded-full border flex items-center justify-center flex-shrink-0 ${color}`}>
              <Icon size={13} />
            </div>
            {idx < items.length - 1 && (
              <div className="w-px flex-1 my-1 bg-border min-h-[24px]" />
            )}
          </div>

          {/* Content */}
          <div className="flex-1 pb-4">
            <p className={`text-xs font-mono font-semibold mb-2 ${color.split(" ")[0]}`}>{label}</p>
            <div className="bg-base/60 border border-border rounded-lg p-3 max-h-48 overflow-y-auto">
              {content}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
