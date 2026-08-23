import { ArrowLeft, User, Bell, Globe, Lock, Palette, CircleHelp, LogOut, ChevronRight, Moon, Sun, Shield, FileText, MessageSquare, CreditCard, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { supabase } from "@/integrations/supabase/client";
import { SUPPORTED_CURRENCIES, getCurrencySymbol } from "@/lib/currency";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

const SettingsPage = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { dark, toggle: toggleDark } = useTheme();
  const [showCurrency, setShowCurrency] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState("USD");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [notifications, setNotifications] = useState({ push: true, email: false, sms: false });

  // Load user's currency from database on mount
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("currency")
        .eq("user_id", user.id)
        .maybeSingle();
      
      if (error) {
        console.error("Failed to load currency:", error);
      } else if (data?.currency) {
        setSelectedCurrency(data.currency);
      }
      setIsLoading(false);
    })();
  }, [user]);

  const handleCurrencySelect = async (currency: string) => {
    if (!user) return;
    
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ currency })
        .eq("user_id", user.id);
      
      if (error) throw error;
      
      setSelectedCurrency(currency);
      setShowCurrency(false);
      toast.success(`Currency changed to ${currency}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to save currency");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth", { replace: true });
  };

  const currencyDisplay = `${selectedCurrency} ${getCurrencySymbol(selectedCurrency)}`;

  const sections = [
    {
      title: "Account",
      items: [
        { icon: User, label: "Edit Profile", action: () => navigate("/profile/edit") },
        { icon: Lock, label: "Password & Security", action: () => {} },
        { icon: CreditCard, label: "Subscription & Billing", action: () => navigate("/subscriptions") },
      ],
    },
    {
      title: "Preferences",
      items: [
        { icon: Globe, label: "Currency", value: currencyDisplay, action: () => setShowCurrency(true) },
        { icon: Palette, label: "Dark Mode", toggle: true, toggled: dark, action: toggleDark },
        { icon: Bell, label: "Notifications", action: () => {} },
      ],
    },
    {
      title: "Privacy",
      items: [
        { icon: Shield, label: "Privacy Settings", action: () => {} },
        { icon: Lock, label: "Blocked Accounts", action: () => {} },
      ],
    },
    {
      title: "Support",
      items: [
        { icon: CircleHelp, label: "Help Center", action: () => {} },
        { icon: MessageSquare, label: "Contact Us", action: () => {} },
        { icon: FileText, label: "Terms & Privacy Policy", action: () => {} },
      ],
    },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24 pt-12 px-4">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center">
          <ArrowLeft className="w-4 h-4 text-foreground" />
        </button>
        <h1 className="text-xl font-bold font-display text-foreground">Settings</h1>
      </div>

      {sections.map((section) => (
        <div key={section.title} className="mb-5">
          <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 px-1">{section.title}</h2>
          <div className="glass-card overflow-hidden divide-y divide-border/50">
            {section.items.map((item) => (
              <button
                key={item.label}
                onClick={item.action}
                disabled={isSaving && item.label === "Currency"}
                className="w-full px-4 py-3.5 flex items-center gap-3 active:bg-secondary/50 transition-colors disabled:opacity-50"
              >
                <item.icon className="w-4.5 h-4.5 text-primary" />
                <span className="flex-1 text-sm font-medium text-foreground text-left">{item.label}</span>
                {item.value && <span className="text-xs text-muted-foreground">{item.value}</span>}
                {item.toggle ? (
                  <div className={`w-10 h-6 rounded-full transition-colors ${item.toggled ? "bg-primary" : "bg-secondary"} relative`}>
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-primary-foreground shadow transition-transform ${item.toggled ? "left-5" : "left-1"}`} />
                  </div>
                ) : (
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                )}
              </button>
            ))}
          </div>
        </div>
      ))}

      <button
        onClick={handleSignOut}
        className="w-full glass-card px-4 py-3.5 flex items-center gap-3 text-destructive active:bg-destructive/10 transition-colors"
      >
        <LogOut className="w-4.5 h-4.5" />
        <span className="text-sm font-semibold">Sign Out</span>
      </button>

      <p className="text-center text-[10px] text-muted-foreground mt-6">RESEEPE v1.0.0</p>

      {/* Currency picker modal */}
      <AnimatePresence>
        {showCurrency && (
          <motion.div
            className="fixed inset-0 z-50 bg-foreground/50 flex items-end justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowCurrency(false)}
          >
            <motion.div
              className="w-full max-w-lg bg-card rounded-t-3xl p-5 pb-10 max-h-[60vh] overflow-y-auto"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-lg font-bold font-display text-foreground mb-4">Select Currency</h2>
              <div className="space-y-1">
                {SUPPORTED_CURRENCIES.map((code) => (
                  <button
                    key={code}
                    onClick={() => handleCurrencySelect(code)}
                    disabled={isSaving}
                    className={`w-full px-4 py-3 rounded-xl text-sm text-left transition-colors disabled:opacity-50 ${
                      selectedCurrency === code ? "bg-primary/10 text-primary font-semibold" : "text-foreground hover:bg-secondary"
                    }`}
                  >
                    {code} {getCurrencySymbol(code)}
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SettingsPage;