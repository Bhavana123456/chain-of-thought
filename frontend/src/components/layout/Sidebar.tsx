import { NavLink } from "react-router-dom";
import {
  LayoutDashboard, ScrollText, FileBarChart2,
  ShieldAlert, KeyRound, Settings, ChevronRight, MessageSquare,
} from "lucide-react";

const nav = [
  { to: "/",        icon: LayoutDashboard, label: "Dashboard" },
  { to: "/chat",    icon: MessageSquare,   label: "Chat" },
  { to: "/audit",   icon: ScrollText,      label: "Audit Logs" },
  { to: "/reports", icon: FileBarChart2,   label: "Reports" },
  { to: "/anomalies", icon: ShieldAlert,   label: "Anomalies",  disabled: true },
  { to: "/api-keys",  icon: KeyRound,      label: "API Keys",   disabled: true },
  { to: "/settings",  icon: Settings,      label: "Settings",   disabled: true },
];

export default function Sidebar() {
  return (
    <aside className="w-56 min-h-screen bg-card border-r border-border flex flex-col">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-accent/20 border border-accent/40 flex items-center justify-center">
            <ShieldAlert size={14} className="text-accent" />
          </div>
          <div>
            <p className="text-white text-sm font-semibold leading-none">ChainOfThought</p>
            <p className="text-muted text-[10px] mt-0.5 font-mono">zero-trust audit</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-4 space-y-0.5">
        {nav.map(({ to, icon: Icon, label, disabled }) =>
          disabled ? (
            <div
              key={to}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-muted/40 cursor-not-allowed select-none text-sm"
            >
              <Icon size={15} />
              <span>{label}</span>
              <span className="ml-auto text-[9px] font-mono border border-border/40 text-muted/30 px-1 rounded">soon</span>
            </div>
          ) : (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors group ${
                  isActive
                    ? "bg-accent/10 text-accent border border-accent/20"
                    : "text-muted hover:text-white hover:bg-white/5"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={15} />
                  <span className="flex-1">{label}</span>
                  {isActive && <ChevronRight size={12} className="text-accent" />}
                </>
              )}
            </NavLink>
          )
        )}
      </nav>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-border">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-muted text-xs font-mono">v1.0.0</span>
        </div>
      </div>
    </aside>
  );
}
