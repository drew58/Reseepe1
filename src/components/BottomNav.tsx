import { Home, Search, PlusCircle, Users, User, Play } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isCreator } = useAuth();

  const hidden = ["/", "/index", "/onboarding", "/auth"];
  if (hidden.includes(location.pathname) || location.pathname.startsWith("/messages/")) return null;

  const tabs = [
    { icon: Home, label: "Home", path: "/home" },
    { icon: Play, label: "Reels", path: "/reels" },
    { icon: Search, label: "Search", path: "/search" },
    ...(isCreator ? [{ icon: PlusCircle, label: "Create", path: "/create" }] : []),
    { icon: Users, label: "Subs", path: "/subscriptions" },
    { icon: User, label: "Profile", path: "/profile" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-xl border-t border-border/50 pb-safe">
      <div className="flex items-center justify-around max-w-lg mx-auto py-2 px-1">
        {tabs.map((tab) => {
          const isActive = location.pathname === tab.path || (tab.path === "/reels" && location.pathname.startsWith("/reels"));
          return (
            <button
              key={tab.label}
              onClick={() => navigate(tab.path)}
              className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl transition-all duration-200 ${
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <tab.icon className={`w-5 h-5 ${isActive ? "stroke-[2.5]" : ""}`} />
              <span className={`text-[10px] ${isActive ? "font-semibold" : "font-medium"}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;