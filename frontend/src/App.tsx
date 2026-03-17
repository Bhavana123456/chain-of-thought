import { Routes, Route } from "react-router-dom";
import Sidebar from "@/components/layout/Sidebar";
import Dashboard from "@/pages/Dashboard";
import Chat from "@/pages/Chat";
import AuditLog from "@/pages/AuditLog";
import Reports from "@/pages/Reports";

export default function App() {
  return (
    <div className="flex min-h-screen bg-base text-white font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Routes>
          <Route path="/"        element={<Dashboard />} />
          <Route path="/chat"    element={<Chat />} />
          <Route path="/audit"   element={<AuditLog />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="*"        element={<Dashboard />} />
        </Routes>
      </div>
    </div>
  );
}
