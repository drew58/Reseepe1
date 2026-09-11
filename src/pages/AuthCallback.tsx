import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const AuthCallback = () => {
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;

    const finishSignIn = async () => {
      const code = new URLSearchParams(window.location.search).get("code");
      const authError = new URLSearchParams(window.location.search).get("error_description");

      if (authError) {
        toast.error(authError);
        navigate("/auth", { replace: true });
        return;
      }

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          toast.error(error.message || "Google sign-in failed");
          navigate("/auth", { replace: true });
          return;
        }
      }

      if (active) navigate("/home", { replace: true });
    };

    void finishSignIn();
    return () => {
      active = false;
    };
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Loader2 className="w-6 h-6 animate-spin text-primary" aria-label="Signing you in" />
    </div>
  );
};

export default AuthCallback;