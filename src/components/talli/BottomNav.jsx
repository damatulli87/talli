import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, Clock, Settings } from "lucide-react";

const TABS = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/history", icon: Clock, label: "History" },
  { to: "/settings", icon: Settings, label: "Settings" },
];

export default function BottomNav({ onTabChange }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const handleTabClick = (to) => {
    if (pathname === to) {
      // Same tab clicked — scroll to top
      onTabChange?.();
    } else {
      // Different tab — navigate
      navigate(to, { replace: true });
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 bg-card/95 backdrop-blur-md border-t border-border" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="max-w-lg mx-auto flex items-center justify-around px-4 pt-2 pb-4">
        {TABS.map(({ to, icon: Icon, label }) => {
          const active = pathname === to;
          return (
            <button
              key={to}
              onClick={() => handleTabClick(to)}
              className={`flex flex-col items-center gap-1 min-w-[60px] py-1 transition-colors ${
                active ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <Icon className={`h-5 w-5 ${active ? "stroke-[2.5]" : "stroke-[1.75]"}`} />
              <span className={`text-[10px] font-medium ${active ? "text-primary" : ""}`}>{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}