import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ChefHat, User, Eye, EyeOff, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const Auth = () => {
  const [isLogin, setIsLogin] = useState(false);
  const [accountType, setAccountType] = useState<"user" | "creator" | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { signUp, signIn } = useAuth();

  const handleSubmit = async () => {
    if (!email || !password) {
      toast.error("Please fill in all fields");
      return;
    }
    if (!isLogin && !displayName) {
      toast.error("Please enter your name");
      return;
    }
    if (!isLogin && accountType === "creator" && !username) {
      toast.error("Please enter a username");
      return;
    }

    setIsLoading(true);
    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) {
          toast.error(error.message);
        } else {
          localStorage.setItem("reseepe_onboarded", "true");
          navigate("/home", { replace: true });
        }
      } else {
        const { error } = await signUp(
          email,
          password,
          displayName,
          accountType || "user",
          accountType === "creator" ? username : undefined
        );
        if (error) {
          toast.error(error.message);
        } else {
          toast.success("Check your email to verify your account!");
          setAccountType(null);
          setEmail("");
          setPassword("");
          setDisplayName("");
          setUsername("");
          setIsLogin(true);
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/home`,
      },
    });
    if (error) toast.error("Google sign-in failed: " + error.message);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col px-6 pt-8 pb-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex-1 max-w-md mx-auto w-full">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold font-display">
            <span className="text-primary">R</span>
            <span className="text-primary">E</span>
            <span className="text-green-500">S</span>
            <span className="text-green-500">E</span>
            <span className="text-green-500">E</span>
            <span className="text-primary">P</span>
            <span className="text-primary">E</span>
          </h1>
          <p className="text-foreground mt-1 text-sm">
            {isLogin ? "Welcome back! Sign in to continue" : "Create your account to get started"}
          </p>
        </div>

        {/* Account Type Selection (Signup only) */}
        {!isLogin && accountType === null && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 mb-8">
            <p className="text-sm font-semibold text-foreground">What describes you best?</p>

            {/* Regular User */}
            <button
              onClick={() => setAccountType("user")}
              className="w-full p-4 rounded-2xl border-2 border-border hover:border-primary hover:bg-primary/5 transition-all flex items-center gap-3"
            >
              <User className="w-6 h-6 text-foreground" />
              <div className="text-left">
                <p className="font-semibold text-foreground text-sm">Food Lover</p>
                <p className="text-xs text-muted-foreground">Discover & enjoy recipes</p>
              </div>
            </button>

            {/* Creator */}
            <button
              onClick={() => setAccountType("creator")}
              className="w-full p-4 rounded-2xl border-2 border-border hover:border-primary hover:bg-primary/5 transition-all flex items-center gap-3"
            >
              <ChefHat className="w-6 h-6 text-primary" />
              <div className="text-left">
                <p className="font-semibold text-foreground text-sm">Recipe Creator</p>
                <p className="text-xs text-muted-foreground">Share your recipes & build audience</p>
              </div>
            </button>
          </motion.div>
        )}

        {/* Form (shown after type selection or on login) */}
        {isLogin || accountType !== null && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            {/* Back button on signup */}
            {!isLogin && accountType && (
              <button
                onClick={() => setAccountType(null)}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors mb-4"
              >
                ← Back to account type
              </button>
            )}

            {/* Display Name */}
            <div>
              <label className="text-xs font-semibold text-foreground block mb-1.5">Full Name</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your full name"
                className="w-full px-4 py-2.5 rounded-xl bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                disabled={isLoading}
              />
            </div>

            {/* Username (Creator only) */}
            {!isLogin && accountType === "creator" && (
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1.5">Username</label>
                <div className="flex items-center">
                  <span className="text-sm text-muted-foreground px-3 py-2.5 bg-secondary rounded-l-xl">@</span>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase())}
                    placeholder="your_username"
                    className="flex-1 px-4 py-2.5 rounded-r-xl bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                    disabled={isLoading}
                  />
                </div>
              </div>
            )}

            {/* Email */}
            <div>
              <label className="text-xs font-semibold text-foreground block mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-4 py-2.5 rounded-xl bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                disabled={isLoading}
              />
            </div>

            {/* Password */}
            <div>
              <label className="text-xs font-semibold text-foreground block mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 rounded-xl bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Creator benefits info */}
            {!isLogin && accountType === "creator" && (
              <div className="p-3 rounded-xl bg-primary/10 border border-primary/20">
                <p className="text-xs text-foreground font-semibold mb-1">Creator Benefits:</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>✓ Get verified badge</li>
                  <li>✓ Monetize your recipes</li>
                  <li>✓ Build your audience</li>
                </ul>
              </div>
            )}

            {/* Submit Button */}
            <button
              onClick={handleSubmit}
              disabled={isLoading}
              className="w-full py-3 rounded-2xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60 flex items-center justify-center gap-2 mt-2"
            >
              {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              {isLogin ? "Sign In" : "Create Account"}
            </button>

            {/* Google Auth */}
            {!isLogin && (
              <>
                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="px-2 bg-background text-muted-foreground">Or continue with</span>
                  </div>
                </div>

                <button
                  onClick={handleGoogleSignIn}
                  className="w-full py-2.5 rounded-xl border border-border hover:bg-secondary transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                  </svg>
                  Google
                </button>
              </>
            )}

            {/* Toggle Auth Mode */}
            <div className="text-center mt-6 text-xs text-muted-foreground">
              {isLogin ? "Don't have an account? " : "Already have an account? "}
              <button
                onClick={() => {
                  setIsLogin(!isLogin);
                  setAccountType(null);
                  setEmail("");
                  setPassword("");
                  setDisplayName("");
                  setUsername("");
                }}
                className="font-semibold text-primary hover:opacity-80 transition-opacity"
              >
                {isLogin ? "Sign up" : "Sign in"}
              </button>
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
};

export default Auth;