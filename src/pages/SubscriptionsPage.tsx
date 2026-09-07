import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Crown, Check, Lock, X, Loader2, Play, Search, Flame } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import VerifiedBadge from "@/components/VerifiedBadge";

type Creator = {
  user_id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  follower_count: number;
  recipe_count: number;
  is_trending: boolean;
  is_premium: boolean;
  verified: boolean;
};

type Recipe = {
  id: string;
  creator_id: string;
  title: string;
  thumbnail_url: string | null;
  cost_estimate: string | null;
  cook_time: string | null;
};

const plans = [
  { name: "Free", price: "$0", period: "/forever", features: ["Browse free recipes", "Save favorites", "Basic search"], current: true },
  { name: "Premium", price: "$4.99", period: "/month", features: ["Exclusive recipes", "Direct creator chat", "No ads", "Meal planner"], popular: true },
  { name: "Pro Chef", price: "$9.99", period: "/month", features: ["Everything in Premium", "1-on-1 sessions", "Early access", "PDF exports"] },
];

const SubscriptionsPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tab, setTab] = useState<"discover" | "subscribed">("discover");
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [creators, setCreators] = useState<Creator[]>([]);
  const [query, setQuery] = useState("");
  const [subscribedIds, setSubscribedIds] = useState<Set<string>>(new Set());
  const [subRecipes, setSubRecipes] = useState<Record<string, Recipe[]>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  // Every signed-up creator is discoverable, no seed table required.
  useEffect(() => {
    (async () => {
      const { data, error } = await (supabase as any).rpc("discover_creators", { search: null, limit_count: 100 });
      if (error) throw error;
      setCreators((data || []) as Creator[]);
      setLoading(false);
    })();
  }, []);

  // Local UI state only: there is no creator-scoped subscriptions table in the current SQL schema.
  useEffect(() => {
    if (!user) {
      setSubscribedIds(new Set());
    }
  }, [user]);

  // Latest recipes for each subscribed creator
  useEffect(() => {
    if (subscribedIds.size === 0) {
      setSubRecipes({});
      return;
    }
    (async () => {
      const { data } = await supabase
        .from("recipes")
        .select("id,creator_id,title,thumbnail_url,cost_estimate,cook_time")
        .in("creator_id", Array.from(subscribedIds))
        .order("created_at", { ascending: false });
      const grouped: Record<string, Recipe[]> = {};
      ((data as any[]) || []).forEach((r) => {
        (grouped[r.creator_id] ||= []).push(r);
      });
      setSubRecipes(grouped);
    })();
  }, [subscribedIds]);

  const subscribe = async (c: Creator) => {
    if (!user) {
      navigate("/auth");
      return;
    }
    if (c.is_premium && !subscribedIds.has(c.user_id)) {
      setShowUpgrade(true);
      return;
    }
    setBusy(c.user_id);

    setSubscribedIds((previous) => {
      const next = new Set(previous);
      if (next.has(c.user_id)) next.delete(c.user_id);
      else next.add(c.user_id);
      return next;
    });

    if (subscribedIds.has(c.user_id)) {
      toast.success(`Unsubscribed from ${c.display_name || c.username}`);
    } else {
      toast.success(`Subscribed to ${c.display_name || c.username}`);
    }
    setBusy(null);
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return creators;
    return creators.filter(
      (c) =>
        c.username?.toLowerCase().includes(q) ||
        (c.display_name || "").toLowerCase().includes(q),
    );
  }, [creators, query]);

  const trending = filtered.filter((c) => c.is_trending);
  const others = filtered.filter((c) => !c.is_trending);
  const subscribedCreators = creators.filter((c) => subscribedIds.has(c.user_id));

  const CreatorCard = ({ c }: { c: Creator }) => {
    const isSubscribed = subscribedIds.has(c.user_id);
    return (
      <div className="glass-card p-3 flex flex-col items-center text-center">
        <button onClick={() => navigate(`/creator/${c.username}`)} className="contents">
          {c.avatar_url ? (
            <img
              src={c.avatar_url}
              alt={c.display_name || c.username}
              className="w-14 h-14 rounded-full object-cover mb-2 border-2 border-primary/30"
            />
          ) : (
            <div className="w-14 h-14 rounded-full bg-primary/20 mb-2 flex items-center justify-center text-sm font-bold text-primary">
              {(c.display_name || c.username || "?")[0]?.toUpperCase()}
            </div>
          )}
          <div className="flex items-center gap-1">
            <h3 className="text-xs font-bold text-foreground truncate">{c.display_name || c.username}</h3>
            {c.verified && <VerifiedBadge size="sm" />}
          </div>
          <p className="text-[10px] text-muted-foreground">@{c.username}</p>
          <p className="text-[10px] text-muted-foreground">
            {c.follower_count} followers · {c.recipe_count} recipes
          </p>
        </button>
        <button
          disabled={busy === c.user_id}
          onClick={() => subscribe(c)}
          className={`mt-2 w-full py-1.5 rounded-xl text-[10px] font-semibold transition-all flex items-center justify-center gap-1 ${
            isSubscribed
              ? "bg-secondary text-muted-foreground"
              : c.is_premium
                ? "bg-gradient-to-r from-primary to-accent text-primary-foreground"
                : "bg-primary text-primary-foreground"
          }`}
        >
          {busy === c.user_id ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <>
              {c.is_premium && !isSubscribed && <Lock className="w-2.5 h-2.5" />}
              {isSubscribed ? "Subscribed" : c.is_premium ? "Premium" : "Subscribe"}
            </>
          )}
        </button>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background pb-24 pt-12 px-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold font-display text-foreground">Subscriptions</h1>
        <button
          onClick={() => setShowUpgrade(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold"
        >
          <Crown className="w-3.5 h-3.5" /> Upgrade
        </button>
      </div>

      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setTab("discover")}
          className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${tab === "discover" ? "bg-primary text-primary-foreground shadow-md shadow-primary/20" : "bg-secondary text-foreground"}`}
        >
          Discover
        </button>
        <button
          onClick={() => setTab("subscribed")}
          className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${tab === "subscribed" ? "bg-primary text-primary-foreground shadow-md shadow-primary/20" : "bg-secondary text-foreground"}`}
        >
          Subscribed {subscribedCreators.length > 0 && `(${subscribedCreators.length})`}
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : tab === "discover" ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="relative mb-4">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search creators by name or @username"
              className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-secondary text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>

          {trending.length > 0 && (
            <>
              <h2 className="flex items-center gap-1.5 text-sm font-bold text-foreground mb-3">
                <Flame className="w-4 h-4 text-primary" /> Trending creators
              </h2>
              <div className="grid grid-cols-2 gap-3 mb-6">
                {trending.map((c) => (
                  <CreatorCard key={c.user_id} c={c} />
                ))}
              </div>
            </>
          )}

          <h2 className="text-sm font-bold text-foreground mb-3">
            {query ? "Search results" : "All creators"}
          </h2>
          {others.length === 0 && trending.length === 0 ? (
            <p className="text-xs text-muted-foreground py-8 text-center">No creators match that search.</p>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {others.map((c) => (
                <CreatorCard key={c.user_id} c={c} />
              ))}
            </div>
          )}
        </motion.div>
      ) : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          {subscribedCreators.length === 0 ? (
            <div className="text-center py-16">
              <Crown className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">No subscriptions yet</p>
              <p className="text-muted-foreground/70 text-xs mt-1">
                Discover creators and subscribe to see their videos here
              </p>
              <button
                onClick={() => setTab("discover")}
                className="mt-4 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold"
              >
                Browse creators
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {subscribedCreators.map((c) => {
                const recipes = subRecipes[c.user_id] || [];
                return (
                  <div key={c.user_id}>
                    <button
                      onClick={() => navigate(`/creator/${c.username}`)}
                      className="flex items-center gap-3 mb-3 w-full text-left"
                    >
                      {c.avatar_url ? (
                        <img
                          src={c.avatar_url}
                          alt={c.display_name || c.username}
                          className="w-11 h-11 rounded-full object-cover border-2 border-primary/30"
                        />
                      ) : (
                        <div className="w-11 h-11 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary">
                          {(c.display_name || c.username || "?")[0]?.toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1">
                          <h3 className="font-bold text-sm text-foreground">{c.display_name || c.username}</h3>
                          {c.verified && <VerifiedBadge size="sm" />}
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          @{c.username} · {recipes.length} videos · tap to see all
                        </p>
                      </div>
                    </button>

                    {recipes.length === 0 ? (
                      <p className="text-xs text-muted-foreground italic px-1">No videos yet from this creator.</p>
                    ) : (
                      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
                        {recipes.slice(0, 6).map((r) => (
                          <div
                            key={r.id}
                            onClick={() => navigate(`/recipe/${r.id}`)}
                            className="flex-shrink-0 w-40 aspect-[9/14] rounded-2xl overflow-hidden relative cursor-pointer active:scale-[0.97] transition-transform"
                          >
                            {r.thumbnail_url && (
                              <img src={r.thumbnail_url} alt={r.title} className="w-full h-full object-cover" loading="lazy" />
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 via-foreground/10 to-transparent" />
                            <div className="absolute top-2 right-2 w-7 h-7 rounded-full bg-foreground/30 backdrop-blur-sm flex items-center justify-center">
                              <Play className="w-3.5 h-3.5 text-primary-foreground fill-current ml-0.5" />
                            </div>
                            <div className="absolute bottom-2 left-2 right-2">
                              <p className="text-[11px] font-bold text-primary-foreground leading-tight line-clamp-2">{r.title}</p>
                              <p className="text-[9px] text-primary-foreground/80 mt-0.5">
                                {r.cook_time} · {r.cost_estimate}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>
      )}

      {/* Upgrade Modal */}
      <AnimatePresence>
        {showUpgrade && (
          <motion.div
            className="fixed inset-0 z-50 bg-foreground/50 flex items-end justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowUpgrade(false)}
          >
            <motion.div
              className="w-full max-w-lg bg-card rounded-t-3xl p-6 pb-10"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-bold font-display text-foreground">Upgrade Your Plan</h2>
                <button
                  onClick={() => setShowUpgrade(false)}
                  className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center"
                >
                  <X className="w-4 h-4 text-foreground" />
                </button>
              </div>
              <div className="space-y-3">
                {plans.map((plan) => (
                  <div
                    key={plan.name}
                    className={`p-4 rounded-2xl border ${plan.popular ? "border-primary bg-primary/5" : "border-border bg-card"}`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-foreground">{plan.name}</h3>
                          {plan.popular && (
                            <span className="bg-primary text-primary-foreground px-2 py-0.5 rounded-full text-[9px] font-bold">
                              Popular
                            </span>
                          )}
                        </div>
                        <div className="flex items-baseline gap-0.5 mt-0.5">
                          <span className="text-xl font-bold text-foreground">{plan.price}</span>
                          <span className="text-xs text-muted-foreground">{plan.period}</span>
                        </div>
                      </div>
                      <button
                        className={`px-4 py-2 rounded-xl text-xs font-semibold ${plan.current ? "bg-secondary text-muted-foreground" : "bg-primary text-primary-foreground"}`}
                      >
                        {plan.current ? "Current" : "Select"}
                      </button>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {plan.features.map((f) => (
                        <span
                          key={f}
                          className="inline-flex items-center gap-1 text-[10px] text-muted-foreground bg-secondary px-2 py-1 rounded-full"
                        >
                          <Check className="w-2.5 h-2.5 text-primary" /> {f}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SubscriptionsPage;
