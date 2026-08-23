import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Crown, Check, Lock, X, Loader2, Play } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import VerifiedBadge from "@/components/VerifiedBadge";

type FeaturedCreator = {
  id: string;
  display_name: string;
  username: string;
  avatar_url: string | null;
  bio: string | null;
  country: string | null;
  verified: boolean;
  is_premium: boolean;
  followers_seed: number;
  // joined-in:
  profile_user_id?: string | null;
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
  const [creators, setCreators] = useState<FeaturedCreator[]>([]);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const [subRecipes, setSubRecipes] = useState<Record<string, Recipe[]>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  // Load creators and join with profile user_ids by username
  useEffect(() => {
    (async () => {
      const { data: fc } = await supabase
        .from("featured_creators" as any)
        .select("*")
        .order("followers_seed", { ascending: false });

      const usernames = ((fc as any[]) || []).map((c) => c.username);
      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id,username")
        .in("username", usernames);

      const usernameToUid = new Map((profs || []).map((p: any) => [p.username, p.user_id]));
      const merged: FeaturedCreator[] = ((fc as any[]) || []).map((c) => ({
        ...c,
        profile_user_id: usernameToUid.get(c.username) || null,
      }));
      setCreators(merged);
      setLoading(false);
    })();
  }, []);

  // Load follows + realtime
  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase.from("follows").select("following_id").eq("follower_id", user.id);
      setFollowingIds(new Set((data || []).map((f) => f.following_id)));
    };
    load();

    const channel = supabase
      .channel("follows-sub-page")
      .on("postgres_changes", { event: "*", schema: "public", table: "follows", filter: `follower_id=eq.${user.id}` }, load)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  // Load latest recipes for each subscribed creator (auto-show videos inline)
  useEffect(() => {
    if (followingIds.size === 0) { setSubRecipes({}); return; }
    (async () => {
      const ids = Array.from(followingIds);
      const { data } = await supabase
        .from("recipes")
        .select("id,creator_id,title,thumbnail_url,cost_estimate,cook_time")
        .in("creator_id", ids)
        .order("created_at", { ascending: false });
      const grouped: Record<string, Recipe[]> = {};
      (data || []).forEach((r: any) => {
        (grouped[r.creator_id] ||= []).push(r);
      });
      setSubRecipes(grouped);
    })();
  }, [followingIds]);

  const subscribe = async (c: FeaturedCreator) => {
    if (!user) { navigate("/auth"); return; }
    if (!c.profile_user_id) { toast.error("Creator profile not ready yet"); return; }
    if (c.is_premium) { setShowUpgrade(true); return; }
    setBusy(c.id);
    const isFollowing = followingIds.has(c.profile_user_id);
    if (isFollowing) {
      const { error } = await supabase.from("follows").delete()
        .eq("follower_id", user.id).eq("following_id", c.profile_user_id);
      if (error) toast.error(error.message); else toast.success(`Unsubscribed from ${c.display_name}`);
    } else {
      const { error } = await supabase.from("follows").insert({ follower_id: user.id, following_id: c.profile_user_id });
      if (error) toast.error(error.message); else toast.success(`Subscribed to ${c.display_name}`);
    }
    setBusy(null);
  };

  const subscribedCreators = creators.filter((c) => c.profile_user_id && followingIds.has(c.profile_user_id));

  return (
    <div className="min-h-screen bg-background pb-24 pt-12 px-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold font-display text-foreground">Subscriptions</h1>
        <button onClick={() => setShowUpgrade(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold">
          <Crown className="w-3.5 h-3.5" /> Upgrade
        </button>
      </div>

      <div className="flex gap-2 mb-5">
        <button onClick={() => setTab("discover")} className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${tab === "discover" ? "bg-primary text-primary-foreground shadow-md shadow-primary/20" : "bg-secondary text-foreground"}`}>Discover</button>
        <button onClick={() => setTab("subscribed")} className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${tab === "subscribed" ? "bg-primary text-primary-foreground shadow-md shadow-primary/20" : "bg-secondary text-foreground"}`}>
          Subscribed {subscribedCreators.length > 0 && `(${subscribedCreators.length})`}
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : tab === "discover" ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <h2 className="text-sm font-bold text-foreground mb-3">Creators worldwide</h2>
          <div className="grid grid-cols-2 gap-3">
            {creators.map((c) => {
              const isFollowing = c.profile_user_id ? followingIds.has(c.profile_user_id) : false;
              return (
                <div key={c.id} className="glass-card p-3 flex flex-col items-center text-center">
                  <button onClick={() => c.profile_user_id && navigate(`/creator/${c.username}`)} className="contents">
                    {c.avatar_url ? (
                      <img src={c.avatar_url} alt={c.display_name} className="w-14 h-14 rounded-full object-cover mb-2 border-2 border-primary/30" />
                    ) : (
                      <div className="w-14 h-14 rounded-full bg-primary/20 mb-2" />
                    )}
                    <div className="flex items-center gap-1">
                      <h3 className="text-xs font-bold text-foreground truncate">{c.display_name}</h3>
                      {c.verified && <VerifiedBadge size="sm" />}
                    </div>
                    <p className="text-[10px] text-muted-foreground">{c.country}</p>
                    <p className="text-[10px] text-muted-foreground">{(c.followers_seed / 1000).toFixed(1)}k followers</p>
                  </button>
                  <button
                    disabled={busy === c.id}
                    onClick={() => subscribe(c)}
                    className={`mt-2 w-full py-1.5 rounded-xl text-[10px] font-semibold transition-all flex items-center justify-center gap-1 ${
                      isFollowing ? "bg-secondary text-muted-foreground"
                      : c.is_premium ? "bg-gradient-to-r from-primary to-accent text-primary-foreground"
                      : "bg-primary text-primary-foreground"
                    }`}
                  >
                    {busy === c.id ? <Loader2 className="w-3 h-3 animate-spin" /> : (
                      <>
                        {c.is_premium && !isFollowing && <Lock className="w-2.5 h-2.5" />}
                        {isFollowing ? "Subscribed" : c.is_premium ? "Premium" : "Subscribe"}
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </motion.div>
      ) : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          {subscribedCreators.length === 0 ? (
            <div className="text-center py-16">
              <Crown className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">No subscriptions yet</p>
              <p className="text-muted-foreground/70 text-xs mt-1">Discover creators and subscribe to see their videos here</p>
              <button onClick={() => setTab("discover")} className="mt-4 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold">Browse creators</button>
            </div>
          ) : (
            <div className="space-y-6">
              {subscribedCreators.map((c) => {
                const recipes = subRecipes[c.profile_user_id!] || [];
                return (
                  <div key={c.id}>
                    <button
                      onClick={() => navigate(`/creator/${c.username}`)}
                      className="flex items-center gap-3 mb-3 w-full text-left"
                    >
                      {c.avatar_url && <img src={c.avatar_url} alt={c.display_name} className="w-11 h-11 rounded-full object-cover border-2 border-primary/30" />}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1">
                          <h3 className="font-bold text-sm text-foreground">{c.display_name}</h3>
                          {c.verified && <VerifiedBadge size="sm" />}
                        </div>
                        <p className="text-[11px] text-muted-foreground">@{c.username} · {recipes.length} videos · tap to see all</p>
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
                            {r.thumbnail_url && <img src={r.thumbnail_url} alt={r.title} className="w-full h-full object-cover" loading="lazy" />}
                            <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 via-foreground/10 to-transparent" />
                            <div className="absolute top-2 right-2 w-7 h-7 rounded-full bg-foreground/30 backdrop-blur-sm flex items-center justify-center">
                              <Play className="w-3.5 h-3.5 text-primary-foreground fill-current ml-0.5" />
                            </div>
                            <div className="absolute bottom-2 left-2 right-2">
                              <p className="text-[11px] font-bold text-primary-foreground leading-tight line-clamp-2">{r.title}</p>
                              <p className="text-[9px] text-primary-foreground/80 mt-0.5">{r.cook_time} · {r.cost_estimate}</p>
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
          <motion.div className="fixed inset-0 z-50 bg-foreground/50 flex items-end justify-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowUpgrade(false)}>
            <motion.div className="w-full max-w-lg bg-card rounded-t-3xl p-6 pb-10" initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 300 }} onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-bold font-display text-foreground">Upgrade Your Plan</h2>
                <button onClick={() => setShowUpgrade(false)} className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center"><X className="w-4 h-4 text-foreground" /></button>
              </div>
              <div className="space-y-3">
                {plans.map((plan) => (
                  <div key={plan.name} className={`p-4 rounded-2xl border ${plan.popular ? "border-primary bg-primary/5" : "border-border bg-card"}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-foreground">{plan.name}</h3>
                          {plan.popular && <span className="bg-primary text-primary-foreground px-2 py-0.5 rounded-full text-[9px] font-bold">Popular</span>}
                        </div>
                        <div className="flex items-baseline gap-0.5 mt-0.5">
                          <span className="text-xl font-bold text-foreground">{plan.price}</span>
                          <span className="text-xs text-muted-foreground">{plan.period}</span>
                        </div>
                      </div>
                      <button className={`px-4 py-2 rounded-xl text-xs font-semibold ${plan.current ? "bg-secondary text-muted-foreground" : "bg-primary text-primary-foreground"}`}>
                        {plan.current ? "Current" : "Select"}
                      </button>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {plan.features.map((f) => (
                        <span key={f} className="inline-flex items-center gap-1 text-[10px] text-muted-foreground bg-secondary px-2 py-1 rounded-full">
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
