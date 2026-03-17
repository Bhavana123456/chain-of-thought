import { useQuery } from "@tanstack/react-query";
import { Activity, Wifi, WifiOff } from "lucide-react";
import { api } from "@/lib/api";

interface Props { title: string; subtitle?: string }

export default function Header({ title, subtitle }: Props) {
  const { data: health } = useQuery({
    queryKey: ["ollama-health"],
    queryFn: api.ollamaHealth,
    retry: false,
    refetchInterval: 30_000,
  });

  const online = health?.status === "ok";

  return (
    <header className="h-14 border-b border-border bg-card/60 backdrop-blur px-6 flex items-center justify-between sticky top-0 z-10">
      <div>
        <h1 className="text-white font-semibold text-sm">{title}</h1>
        {subtitle && <p className="text-muted text-xs font-mono">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-4">
        {/* Live indicator */}
        <div className="flex items-center gap-1.5 text-xs font-mono">
          <Activity size={12} className="text-accent animate-pulse" />
          <span className="text-muted">live</span>
        </div>

        {/* Ollama status */}
        <div
          className={`flex items-center gap-1.5 text-xs font-mono px-2.5 py-1 rounded-full border ${
            online
              ? "border-green-500/30 bg-green-500/10 text-green-400"
              : "border-red-500/30 bg-red-500/10 text-red-400"
          }`}
        >
          {online ? <Wifi size={11} /> : <WifiOff size={11} />}
          <span>Ollama {online ? "online" : "offline"}</span>
        </div>

        {/* Trust badge */}
        <div className="flex items-center gap-1.5 text-xs font-mono px-2.5 py-1 rounded-full border border-accent/30 bg-accent/10 text-accent">
          <span>zero-trust</span>
          <span className="w-1.5 h-1.5 rounded-full bg-accent" />
        </div>
      </div>
    </header>
  );
}
