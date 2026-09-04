import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Edit, CheckCircle, AlertCircle, Crown, Lock, UserPlus, UserCheck, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import VerifiedBadge from "@/components/VerifiedBadge";

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
  const [following, setFollowing] = useState(false);
  const [subscription, setSubscription] = useState<{ tier: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<"follow" | "subscribe" | null>(null);
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [verified, setVerified] = useState(false);
  const [isPremiumCreator, setIsPremiumCreator] = useState(false);
  const [profileCompletion, setProfileCompletion] = useState(0);
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

        let completion = 0;
        if (profileRow.avatar_url) completion += 25;
        if (profileRow.bio) completion += 25;
        if (profileRow.display_name) completion += 25;
        if (profileRow.username) completion += 25;
        setProfileCompletion(completion);

        const { data: recs } = await (supabase as any)
          .from("recipes")
          .select("*")
          .eq("creator_id", profileRow.user_id)
          .order("created_at", { ascending: false })
          .limit(12);
        setRecipes((recs as any[]) || []);

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
    if (error) toast.error(error.message);
    else {
      setSubscription({ tier });
      toast.success(tier === "premium" ? "Premium subscription active" : "Subscribed for free content");
    }
    setBusy(null);
    setShowPlans(false);
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
    <div className="min-h-screen bg-background pb-20">
      {/* Profile Header */}
      <div className="bg-gradient-to-b from-secondary to-background px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="flex justify-center mb-4">
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.display_name || ""}
                className="w-20 h-20 rounded-full object-cover border-4 border-primary"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-secondary border-4 border-primary flex items-center justify-center">
                <span className="text-2xl font-bold text-foreground">
                  {profile.display_name?.[0]?.toUpperCase()}
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-center gap-2 mb-1">
            <h1 className="text-2xl font-bold text-foreground">{profile.display_name}</h1>
            {verified && <VerifiedBadge size="md" />}
          </div>

          <p className="text-center text-muted-foreground text-sm mb-4">@{profile.username}</p>

          <div className="flex justify-center gap-8 mb-6 py-4 border-y border-border">
            <div className="text-center">
              <p className="text-lg font-bold text-foreground">{recipes.length}</p>
              <p className="text-xs text-muted-foreground">Recipes</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-foreground">{followers}</p>
              <p className="text-xs text-muted-foreground">Followers</p>
            </div>
          </div>

          {profile.bio && <p className="text-sm text-foreground text-center mb-4">{profile.bio}</p>}

          {isOwnProfile && (
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                {profileCompletion === 100 ? (
                  <>
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="text-xs font-semibold text-green-500">Profile Complete</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-4 h-4 text-yellow-500" />
                    <span className="text-xs font-semibold text-yellow-500">
                      Profile {profileCompletion}% Complete
                    </span>
                  </>
                )}
              </div>
              <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                <div className="h-full bg-primary transition-all" style={{ width: `${profileCompletion}%` }} />
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2">
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
      </div>

      {/* Recipes Grid */}
      <div className="max-w-2xl mx-auto px-4 py-8">
        {recipes.length > 0 ? (
          <div className="grid grid-cols-2 gap-4">
            {recipes.map((recipe) => {
              const locked = recipe.access_tier === "premium" && !hasPremium && !isOwnProfile;
              return (
                <div
                  key={recipe.id}
                  onClick={() => (locked ? setShowPlans(true) : navigate(`/recipe/${recipe.id}`))}
                  className="aspect-square rounded-lg overflow-hidden cursor-pointer hover:opacity-80 transition-opacity bg-secondary relative"
                >
                  {recipe.thumbnail_url && (
                    <img
                      src={recipe.thumbnail_url}
                      alt={recipe.title}
                      className={`w-full h-full object-cover ${locked ? "blur-md scale-105" : ""}`}
                      loading="lazy"
                    />
                  )}
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
