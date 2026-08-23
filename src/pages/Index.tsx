import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import SplashScreen from "./SplashScreen";

const Index = () => {
  const navigate = useNavigate();
  const [showSplash, setShowSplash] = useState(true);
  const { session, loading } = useAuth();

  const handleSplashComplete = () => {
    setShowSplash(false);
    if (loading) return;
    if (session) {
      navigate("/home", { replace: true });
    } else {
      const seen = localStorage.getItem("reseepe_onboarded");
      if (!seen) {
        navigate("/onboarding", { replace: true });
      } else {
        navigate("/auth", { replace: true });
      }
    }
  };

  return (
    <AnimatePresence>
      {showSplash && <SplashScreen onComplete={handleSplashComplete} />}
    </AnimatePresence>
  );
};

export default Index;
