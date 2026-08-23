import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Edit, CheckCircle, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import VerifiedBadge from "@/components/VerifiedBadge";

const CreatorProfile = () => {
  const { username } = useParams();
  const navigate = useNavigate();
  const { user, isCreator } = useAuth();
  const [profile, setProfile] = useState<{
    user_id: string; display_name: string | null; username: string | null;
    avatar_url: string | null; bio: string | null;
  } | null>(null);
  const [recipes, setRecipes] = useState<{ id: string; title: string; thumbnail_url: string | null }[]>([]);
  const [followers, setFollowers] = useState(0);
  const [following, setFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [verified, setVerified] = useState(false);
  const [profileCompletion, setProfileCompletion] = useState(0);

  useEffect(() => {
    (async () => {
      if (!username) return;

      // Fetch creator profile
      const { data: prof } = await supabase
        .from("profiles")
        .select("*")
        .eq("username", username)
        .single();

      if (prof) {
        setProfile(prof);
        setIsOwnProfile(prof.user_id === user?.id);

        // Check verification
        const { data: fc } = await supabase
          .from("featured_creators")
          .select("verified")
          .eq("username", username)
          .single();

        setVerified(!!fc?.verified);

        // Calculate profile completion
        let completion = 0;
        if (prof.avatar_url) completion += 25;
        if (prof.bio) completion += 25;
        if (prof.display_name) completion += 25;
        if (prof.username) completion += 25;
        setProfileCompletion(completion);

        // Fetch recipes
        const { data: recs } = await supabase
          .from("recipes")
          .select("*")
          .eq("creator_id", prof.user_id)
          .order("created_at", { ascending: false })
          .limit(12);

        setRecipes(recs || []);

        // Fetch followers
        const { data: follows } = await supabase
          .from("follows")
          .select("*", { count: "exact" })
          .eq("following_id", prof.user_id);

        setFollowers(follows?.length || 0);

        if (user) {
          const { data: isFollowing } = await supabase
            .from("follows")
            .select("*")
            .eq("follower_id", user.id)
            .eq("following_id", prof.user_id)
            .single();

          setFollowing(!!isFollowing);
        }
      }
      setLoading(false);
    })();
  }, [username, user?.id]);

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

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Profile Header */}
      <div className="bg-gradient-to-b from-secondary to-background px-4 py-8">
        <div className="max-w-2xl mx-auto">
          {/* Avatar */}
          <div className="flex justify-center mb-4">
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.display_name}
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

          {/* Name with Verified Badge */}
          <div className="flex items-center justify-center gap-2 mb-1">
            <h1 className="text-2xl font-bold text-foreground">{profile.display_name}</h1>
            {verified && <VerifiedBadge size="md" />}
          </div>

          <p className="text-center text-muted-foreground text-sm mb-4">@{profile.username}</p>

          {/* Stats */}
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

          {/* Bio */}
          {profile.bio && (
            <p className="text-sm text-foreground text-center mb-4">{profile.bio}</p>
          )}

          {/* Profile Completion Status */}
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
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${profileCompletion}%` }}
              />
            </div>
          </div>

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
              <button
                onClick={async () => {
                  if (!user) return navigate("/auth");
                  if (following) {
                    await supabase
                      .from("follows")
                      .delete()
                      .eq("follower_id", user.id)
                      .eq("following_id", profile.user_id);
                  } else {
                    await supabase.from("follows").insert({
                      follower_id: user.id,
                      following_id: profile.user_id,
                    });
                  }
                  setFollowing(!following);
                }}
                className={`flex-1 py-2 rounded-lg font-semibold text-sm transition-colors ${
                  following
                    ? "bg-secondary text-foreground hover:bg-secondary/80"
                    : "bg-primary text-primary-foreground hover:bg-primary/90"
                }`}
              >
                {following ? "Following" : "Follow"}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Recipes Grid */}
      <div className="max-w-2xl mx-auto px-4 py-8">
        {recipes.length > 0 ? (
          <div className="grid grid-cols-2 gap-4">
            {recipes.map((recipe) => (
              <div
                key={recipe.id}
                onClick={() => navigate(`/recipe/${recipe.id}`)}
                className="aspect-square rounded-lg overflow-hidden cursor-pointer hover:opacity-80 transition-opacity bg-secondary"
              >
                {recipe.thumbnail_url && (
                  <img
                    src={recipe.thumbnail_url}
                    alt={recipe.title}
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No recipes yet</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CreatorProfile;
