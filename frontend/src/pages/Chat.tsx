import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Send, Bot, User, AlertTriangle, ShieldCheck, Clock } from "lucide-react";
import { api } from "@/lib/api";
import { formatMs, riskColor, complianceBadge, complianceLabel } from "@/lib/utils";
import Header from "@/components/layout/Header";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface LastMeta {
  risk_score: number;
  compliance_status: string;
  latency_ms: number;
  model: string;
  checksum: string;
}

export default function Chat() {
  const [model, setModel] = useState("");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastMeta, setLastMeta] = useState<LastMeta | null>(null);
  const [userId] = useState("user-" + Math.random().toString(36).slice(2, 7));
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: ollamaModels } = useQuery({
    queryKey: ["ollama-models"],
    queryFn: api.ollamaModels,
  });

  // Auto-select first model
  useEffect(() => {
    if (ollamaModels?.length && !model) {
      setModel(ollamaModels[0].name);
    }
  }, [ollamaModels, model]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const send = async () => {
    const text = input.trim();
    if (!text || !model || loading) return;

    const userMsg: Message = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await api.chat({
        model,
        messages: [...messages, userMsg],
        user_id: userId,
      }) as {
        response: string;
        risk_score: number;
        compliance_status: string;
        latency_ms: number;
        checksum: string;
      };

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: res.response },
      ]);
      setLastMeta({
        risk_score: res.risk_score,
        compliance_status: res.compliance_status,
        latency_ms: res.latency_ms,
        model,
        checksum: res.checksum,
      });
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Error: Could not reach the model. Is Ollama running?" },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const examples = [
    "Explain what zero-trust security means",
    "Summarise the EU AI Act in 3 bullet points",
    "What are the risks of using LLMs in healthcare?",
    "My email is test@example.com — what data do companies hold about me?",
  ];

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <Header title="Chat" subtitle="Every message is audited and logged automatically" />

      <div className="flex-1 flex flex-col max-w-3xl w-full mx-auto px-4 pb-4">

        {/* Model selector */}
        <div className="flex items-center gap-3 py-4">
          <span className="text-muted text-xs font-mono">Model:</span>
          {ollamaModels?.length ? (
            <select
              className="input-field py-1.5 w-52"
              value={model}
              onChange={(e) => setModel(e.target.value)}
            >
              {ollamaModels.map((m) => (
                <option key={m.name} value={m.name}>{m.name}</option>
              ))}
            </select>
          ) : (
            <span className="text-red-400 text-xs font-mono">
              No models found — run: ollama pull llama3.2
            </span>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 space-y-4 overflow-y-auto min-h-[300px]">
          {messages.length === 0 && (
            <div className="py-12 text-center space-y-6">
              <div className="w-12 h-12 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center mx-auto">
                <Bot size={22} className="text-accent" />
              </div>
              <div>
                <p className="text-white font-semibold">Start a conversation</p>
                <p className="text-muted text-sm mt-1">
                  Every prompt is risk-scored, checksummed, and logged in the Audit Log.
                </p>
              </div>
              {/* Example prompts */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-lg mx-auto text-left">
                {examples.map((ex) => (
                  <button
                    key={ex}
                    onClick={() => setInput(ex)}
                    className="text-left px-3 py-2.5 rounded-lg border border-border hover:border-accent/40 hover:bg-accent/5 text-muted hover:text-white text-xs font-mono transition-colors"
                  >
                    {ex}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              {msg.role === "assistant" && (
                <div className="w-7 h-7 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center flex-shrink-0 mt-1">
                  <Bot size={13} className="text-accent" />
                </div>
              )}
              <div
                className={`max-w-xl px-4 py-3 rounded-2xl text-sm font-mono leading-relaxed whitespace-pre-wrap ${
                  msg.role === "user"
                    ? "bg-accent/10 border border-accent/20 text-white rounded-tr-sm"
                    : "bg-card border border-border text-white/90 rounded-tl-sm"
                }`}
              >
                {msg.content}
              </div>
              {msg.role === "user" && (
                <div className="w-7 h-7 rounded-full bg-white/5 border border-border flex items-center justify-center flex-shrink-0 mt-1">
                  <User size={13} className="text-muted" />
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex gap-3 justify-start">
              <div className="w-7 h-7 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center flex-shrink-0">
                <Bot size={13} className="text-accent" />
              </div>
              <div className="bg-card border border-border rounded-2xl rounded-tl-sm px-4 py-3">
                <div className="flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="w-1.5 h-1.5 bg-muted rounded-full animate-bounce"
                      style={{ animationDelay: `${i * 0.15}s` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Last response audit metadata */}
        {lastMeta && !loading && (
          <div className="flex flex-wrap items-center gap-3 py-2 px-3 bg-base/60 border border-border rounded-lg my-2 text-[11px] font-mono">
            <span className={complianceBadge(lastMeta.compliance_status)}>
              {complianceLabel(lastMeta.compliance_status)}
            </span>
            <span className="flex items-center gap-1">
              <AlertTriangle size={10} className={riskColor(lastMeta.risk_score)} />
              <span className={riskColor(lastMeta.risk_score)}>
                Risk {(lastMeta.risk_score * 100).toFixed(0)}%
              </span>
            </span>
            <span className="flex items-center gap-1 text-muted">
              <Clock size={10} />
              {formatMs(lastMeta.latency_ms)}
            </span>
            <span className="flex items-center gap-1 text-muted">
              <ShieldCheck size={10} />
              {lastMeta.checksum?.slice(0, 12)}…
            </span>
            <span className="text-muted ml-auto">logged to audit →</span>
          </div>
        )}

        {/* Input */}
        <div className="flex gap-2 items-end mt-1">
          <textarea
            className="input-field resize-none flex-1 py-3 min-h-[48px] max-h-32"
            rows={1}
            placeholder="Type a message… (Enter to send, Shift+Enter for new line)"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
          />
          <button
            onClick={send}
            disabled={!input.trim() || !model || loading}
            className="btn-primary h-12 w-12 flex items-center justify-center flex-shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
