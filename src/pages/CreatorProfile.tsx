import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Edit, Crown, Lock, UserPlus, UserCheck, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import VerifiedBadge from "@/components/VerifiedBadge";
import ProfileCompletionCard from "@/components/ProfileCompletionCard";

type ProfileRecord = {
  user_id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  bio: string | null;
};

const CreatorProfile = () => {
  const { username } = useParams();
  const navigate = useNavigate();
  const { user, isCreator } = useAuth();
  const [profile, setProfile] = useState<ProfileRecord | null>(null);
  const [recipes, setRecipes] = useState<
    { id: string; title: string; thumbnail_url: string | null; access_tier?: string | null }[]
  >([]);
  const [followers, setFollowers] = useState(0);
  const [recipeCount, setRecipeCount] = useState(0);
  const [following, setFollowing] = useState(false);
  const [subscription, setSubscription] = useState<{ tier: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<"follow" | "subscribe" | null>(null);
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [verified, setVerified] = useState(false);
  const [isPremiumCreator, setIsPremiumCreator] = useState(false);
  const [showPlans, setShowPlans] = useState(false);

  useEffect(() => {
    (async () => {
      if (!username) {
        setLoading(false);
        return;
      }

      const { data: prof } = await (supabase as any)
        .from("profiles")
        .select("*")
        .eq("username", username)
        .maybeSingle();

      if (prof) {
        const profileRow = prof as ProfileRecord;
        setProfile(profileRow);
        setIsOwnProfile(profileRow.user_id === user?.id);

        const { data: fc } = await (supabase as any)
          .from("featured_creators")
          .select("verified,is_premium")
          .eq("username", username)
          .maybeSingle();
        setVerified(Boolean(fc?.verified));
        setIsPremiumCreator(Boolean(fc?.is_premium));

        const { data: recs, count: totalRecipes } = await (supabase as any)
          .from("recipes")
          .select("*", { count: "exact" })
          .eq("creator_id", profileRow.user_id)
          .order("created_at", { ascending: false })
          .limit(12);
        setRecipes((recs as any[]) || []);
        setRecipeCount(totalRecipes || 0);

        const { count } = await (supabase as any)
          .from("follows")
          .select("*", { count: "exact", head: true })
          .eq("following_id", profileRow.user_id);
        setFollowers(count || 0);

        if (user) {
          const { data: isFollowing } = await (supabase as any)
            .from("follows")
            .select("follower_id")
            .eq("follower_id", user.id)
            .eq("following_id", profileRow.user_id)
            .maybeSingle();
          setFollowing(Boolean(isFollowing));

          const { data: sub } = await (supabase as any)
            .from("billing_subscriptions")
            .select("tier,status")
            .eq("user_id", user.id)
            .maybeSingle();
          setSubscription(sub?.tier ? { tier: sub.tier } : null);
        }
      }
      setLoading(false);
    })();
  }, [username, user?.id]);

  // Follow = see this creator's recipes in your feed.
  const toggleFollow = async () => {
    if (!user) return navigate("/auth");
    if (!profile) return;
    setBusy("follow");
    if (following) {
      const { error } = await (supabase as any)
        .from("follows")
        .delete()
        .eq("follower_id", user.id)
        .eq("following_id", profile.user_id);
      if (error) toast.error(error.message);
      else {
        setFollowing(false);
        setFollowers((f) => Math.max(0, f - 1));
      }
    } else {
      const { error } = await (supabase as any)
        .from("follows")
        .insert({ follower_id: user.id, following_id: profile.user_id });
      if (error) toast.error(error.message);
      else {
        setFollowing(true);
        setFollowers((f) => f + 1);
      }
    }
    setBusy(null);
  };

  // Subscribe = free tier (all free content) or premium tier (paid content).
  const subscribeTo = async (tier: "free" | "premium") => {
    if (!user) return navigate("/auth");
    if (!profile) return;
    setBusy("subscribe");
    try {
      const { error } = await (supabase as any)
        .from("billing_subscriptions")
        .upsert(
          {
            user_id: user.id,
            provider: "manual",
            tier,
            status: "active",
            current_period_ends_at: null,
          },
          { onConflict: "user_id" },
        );
      if (error) throw error;
      setSubscription({ tier });
      toast.success(tier === "premium" ? "Premium subscription active" : "Subscribed for free content");
      setShowPlans(false);
    } catch (error: any) {
      toast.error(error.message || "Unable to update subscription");
    } finally {
      setBusy(null);
    }
  };

  const unsubscribe = async () => {
    if (!user || !profile) return;
    setBusy("subscribe");
    const { error } = await (supabase as any)
      .from("billing_subscriptions")
      .delete()
      .eq("user_id", user.id);
    if (error) toast.error(error.message);
    else {
      setSubscription(null);
      toast.success("Subscription cancelled");
    }
    setBusy(null);
    setShowPlans(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Creator not found</p>
      </div>
    );
  }

  const hasPremium = subscription?.tier === "premium";

  return (
    <div className="min-h-screen bg-background pb-24 pt-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">Creator profile</p>
            <h1 className="text-xl font-bold font-display text-foreground">{profile.display_name}</h1>
          </div>
          {verified && <VerifiedBadge size="md" />}
        </div>

        <div className="glass-card p-5 flex items-center gap-4 mb-3">
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt={profile.display_name || ""} className="w-16 h-16 rounded-full object-cover" />
          ) : (
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-primary-foreground text-xl font-bold">
              {profile.display_name?.[0]?.toUpperCase() || "C"}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <h2 className="font-bold text-foreground truncate">{profile.display_name}</h2>
              <span className="text-[9px] font-bold bg-fresh/15 text-fresh px-1.5 py-0.5 rounded-full">CREATOR</span>
            </div>
            <p className="text-xs text-muted-foreground truncate">@{profile.username}</p>
            {profile.bio && <p className="text-xs text-foreground/80 mt-1 line-clamp-2">{profile.bio}</p>}
          </div>
        </div>

        {isOwnProfile && <ProfileCompletionCard profile={profile} isCreator />}

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="glass-card p-3 text-center">
            <p className="font-bold text-foreground">{recipeCount}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Recipes</p>
          </div>
          <div className="glass-card p-3 text-center">
            <p className="font-bold text-foreground">{followers}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Followers</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 mb-4">
            {isOwnProfile ? (
              <>
                <button
                  onClick={() => navigate("/profile/edit")}
                  className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
                >
                  <Edit className="w-4 h-4" /> Edit Profile
                </button>
                {isCreator && (
                  <button
                    onClick={() => navigate("/create")}
                    className="flex-1 py-2 rounded-lg bg-secondary text-foreground font-semibold text-sm hover:bg-secondary/80 transition-colors"
                  >
                    Create
                  </button>
                )}
              </>
            ) : (
              <>
                <button
                  onClick={toggleFollow}
                  disabled={busy === "follow"}
                  className={`flex-1 py-2 rounded-lg font-semibold text-sm transition-colors flex items-center justify-center gap-2 ${
                    following
                      ? "bg-secondary text-foreground hover:bg-secondary/80"
                      : "bg-primary text-primary-foreground hover:bg-primary/90"
                  }`}
                >
                  {busy === "follow" ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : following ? (
                    <>
                      <UserCheck className="w-4 h-4" /> Following
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" /> Follow
                    </>
                  )}
                </button>

                <button
                  onClick={() => setShowPlans((v) => !v)}
                  disabled={busy === "subscribe"}
                  className={`flex-1 py-2 rounded-lg font-semibold text-sm transition-colors flex items-center justify-center gap-2 ${
                    subscription
                      ? "bg-secondary text-foreground"
                      : "bg-gradient-to-r from-primary to-accent text-primary-foreground"
                  }`}
                >
                  {busy === "subscribe" ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : subscription ? (
                    <>
                      <Crown className="w-4 h-4" /> {hasPremium ? "Premium" : "Subscribed"}
                    </>
                  ) : (
                    <>
                      <Crown className="w-4 h-4" /> Subscribe
                    </>
                  )}
                </button>
              </>
            )}
          </div>

        {/* Follow vs Subscribe explainer + tier picker */}
        {!isOwnProfile && showPlans && (
            <div className="mt-3 rounded-2xl border border-border bg-card p-4 space-y-3">
              <p className="text-[11px] text-muted-foreground">
                <span className="font-semibold text-foreground">Follow</span> puts their recipes in your feed.{" "}
                <span className="font-semibold text-foreground">Subscribe</span> chooses how much of their
                content you get.
              </p>
              <button
                onClick={() => subscribeTo("free")}
                className={`w-full text-left p-3 rounded-xl border text-sm ${
                  subscription?.tier === "free" ? "border-primary bg-primary/5" : "border-border"
                }`}
              >
                <span className="font-semibold text-foreground">Free</span>
                <span className="block text-[11px] text-muted-foreground">
                  All of this creator's free recipes and stories.
                </span>
              </button>
              <button
                onClick={() => subscribeTo("premium")}
                className={`w-full text-left p-3 rounded-xl border text-sm ${
                  subscription?.tier === "premium" ? "border-primary bg-primary/5" : "border-border"
                }`}
              >
                <span className="font-semibold text-foreground flex items-center gap-1">
                  Premium <Crown className="w-3.5 h-3.5 text-primary" />
                </span>
                <span className="block text-[11px] text-muted-foreground">
                  Everything free, plus exclusive premium recipes and direct chat.
                </span>
              </button>
              {subscription && (
                <button onClick={unsubscribe} className="w-full py-2 text-xs font-semibold text-destructive">
                  Cancel subscription
                </button>
              )}
            </div>
        )}
        </div>

      {/* Recipes Grid */}
      <div className="max-w-2xl mx-auto pt-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-foreground">Recipes by {profile.display_name}</h2>
          <span className="text-xs text-muted-foreground">{recipeCount} total</span>
        </div>
        {recipes.length > 0 ? (
          <div className="grid grid-cols-2 gap-3">
            {recipes.map((recipe) => {
              const locked = recipe.access_tier === "premium" && !hasPremium && !isOwnProfile;
              return (
                <div
                  key={recipe.id}
                  onClick={() => (locked ? setShowPlans(true) : navigate(`/recipe/${recipe.id}`))}
                  className="aspect-square rounded-2xl overflow-hidden cursor-pointer active:scale-[0.97] transition-transform bg-secondary relative"
                >
                  <img
                    src={recipe.thumbnail_url || "/placeholder.svg"}
                    alt={recipe.title}
                    className={`w-full h-full object-cover ${locked ? "blur-md scale-105" : ""}`}
                    loading="lazy"
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-foreground/80 to-transparent p-2">
                    <p className="text-[10px] font-semibold text-primary-foreground line-clamp-2">{recipe.title}</p>
                  </div>
                  {locked && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-foreground/30">
                      <Lock className="w-5 h-5 text-primary-foreground" />
                      <span className="text-[10px] font-semibold text-primary-foreground">Premium</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No recipes yet</p>
          </div>
        )}
      </div>

      {isPremiumCreator && !subscription && !isOwnProfile && (
        <p className="text-center text-[11px] text-muted-foreground px-6 pb-6">
          This creator publishes premium recipes. Following is always free.
        </p>
      )}
    </div>
  );
};

export default CreatorProfile;
