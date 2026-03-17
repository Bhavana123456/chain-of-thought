export interface AuditLog {
  id: string;
  session_id: string;
  trace_id: string | null;
  model: string;
  prompt: string;
  response: string | null;
  prompt_tokens: number;
  completion_tokens: number;
  latency_ms: number;
  risk_score: number;
  risk_flags: string[];
  status: string;
  compliance_status: string;
  checksum: string | null;
  thought_chain: unknown[] | null;
  rag_context: unknown[] | null;
  user_id: string | null;
  created_at: string;
}

export interface AuditListResponse {
  total: number;
  page: number;
  page_size: number;
  items: AuditLog[];
}

export interface DashboardStats {
  total_traces: number;
  active_models: number;
  high_risk_count: number;
  avg_latency_ms: number;
  total_tokens: number;
  error_rate: number;
  traces_today: number;
  blocked_count: number;
}

export interface RiskDistribution {
  low: number;
  medium: number;
  high: number;
}

export interface ModelStat {
  name: string;
  display_name: string;
  total_calls: number;
  avg_latency_ms: number;
  is_active: boolean;
  last_used: string | null;
}

export interface OllamaModel {
  name: string;
  size_gb: number;
  modified_at: string | null;
}

export interface RecentActivity {
  id: string;
  model: string;
  prompt_preview: string;
  risk_score: number;
  compliance_status: string;
  latency_ms: number;
  created_at: string;
}

async function req<T>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...opts,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail ?? "Request failed");
  }
  return res.json();
}

export const api = {
  stats: () => req<DashboardStats>("/api/dashboard/stats"),
  riskDist: () => req<RiskDistribution>("/api/dashboard/risk-distribution"),
  recentActivity: (limit = 10) =>
    req<RecentActivity[]>(`/api/dashboard/recent-activity?limit=${limit}`),
  modelStats: () => req<ModelStat[]>("/api/dashboard/models"),
  ollamaHealth: () =>
    req<{ status: string; url: string }>("/api/dashboard/ollama/health"),
  ollamaModels: () => req<OllamaModel[]>("/api/dashboard/ollama/models"),

  auditList: (params: Record<string, string | number | undefined>) => {
    const q = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== "") q.set(k, String(v));
    });
    return req<AuditListResponse>(`/api/audit?${q}`);
  },
  auditGet: (id: string) => req<AuditLog>(`/api/audit/${id}`),

  chat: (body: {
    model: string;
    messages: { role: string; content: string }[];
    session_id?: string;
    user_id?: string;
  }) => req("/api/chat", { method: "POST", body: JSON.stringify(body) }),
};
