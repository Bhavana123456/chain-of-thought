export function cn(...classes: (string | undefined | false | null)[]) {
  return classes.filter(Boolean).join(" ");
}

export function riskLabel(score: number): "low" | "medium" | "high" {
  if (score >= 0.7) return "high";
  if (score >= 0.3) return "medium";
  return "low";
}

export function riskColor(score: number) {
  if (score >= 0.7) return "text-red-400";
  if (score >= 0.3) return "text-yellow-400";
  return "text-green-400";
}

export function complianceBadge(status: string) {
  switch (status) {
    case "verified":    return "badge-verified";
    case "flagged":     return "badge-flagged";
    case "needs_review": return "badge-review";
    default:            return "badge-verified";
  }
}

export function complianceLabel(status: string) {
  switch (status) {
    case "verified":    return "Verified";
    case "flagged":     return "Flagged";
    case "needs_review": return "Needs Review";
    default:            return status;
  }
}

export function formatMs(ms: number) {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    hour12: false,
  });
}

export function truncate(str: string, len = 80) {
  return str.length <= len ? str : str.slice(0, len) + "…";
}

export function shortHash(hash: string | null) {
  return hash ? hash.slice(0, 8) + "…" + hash.slice(-4) : "—";
}
