import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Heart, MessageSquare, Eye, Settings, CheckCircle, AlertCircle, Plus } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

const CreatorDashboard = () => {
  const navigate = useNavigate();
  const { user, isCreator } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [recipes, setRecipes] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalViews: 0,
    totalLikes: 0,
    totalComments: 0,
    followers: 0,
  });
  const [profileCompletion, setProfileCompletion] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !isCreator) return;

    (async () => {
      // Fetch creator profile
      const { data: prof } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (prof) {
        setProfile(prof);

        // Calculate profile completion
        let completion = 0;
        if (prof.avatar_url) completion += 20;
        if (prof.display_name) completion += 20;
        if (prof.username) completion += 20;
        if (prof.bio) completion += 20;
        if (prof.country) completion += 20;
        setProfileCompletion(completion);

        // Fetch creator's recipes
        const { data: recs } = await supabase
          .from("recipes")
          .select("id, title, like_count, comment_count, created_at")
          .eq("creator_id", user.id)
          .order("created_at", { ascending: false });

        setRecipes(recs || []);

        // Calculate stats
        if (recs) {
          const likes = recs.reduce((sum, r) => sum + (r.like_count || 0), 0);
          const comments = recs.reduce((sum, r) => sum + (r.comment_count || 0), 0);

          // Fetch followers
          const { data: followers } = await supabase
            .from("follows")
            .select("*", { count: "exact" })
            .eq("creator_id", user.id);

          setStats({
            totalLikes: likes,
            totalComments: comments,
            followers: followers?.length || 0,
            totalViews: 0, // Would need view tracking in DB
          });
        }
      }

      setLoading(false);
    })();
  }, [user, isCreator]);

  if (!isCreator) return null;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const isProfileComplete = profileCompletion === 100;

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-lg px-4 py-4 border-b border-border">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <h1 className="text-2xl font-bold text-foreground">Creator Hub</h1>
          <button
            onClick={() => navigate("/settings")}
            className="w-10 h-10 rounded-full bg-secondary hover:bg-secondary/80 flex items-center justify-center transition-colors"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Profile Section */}
      <div className="px-4 py-6 max-w-2xl mx-auto space-y-6">
        {/* Profile Card */}
        <div className="bg-gradient-to-br from-primary/10 to-accent/10 rounded-2xl p-6 border border-primary/20">
          <div className="flex gap-4 mb-4">
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.display_name}
                className="w-20 h-20 rounded-full object-cover"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-2xl font-bold">
                {profile?.display_name?.[0]}
              </div>
            )}
            <div className="flex-1">
              <h2 className="text-xl font-bold text-foreground">{profile?.display_name}</h2>
              <p className="text-sm text-muted-foreground">@{profile?.username}</p>
              {profile?.bio && <p className="text-sm text-foreground/80 mt-2">{profile.bio}</p>}
            </div>
          </div>

          {/* Profile Completion */}
          <div className="pt-4 border-t border-primary/20">
            <div className="flex items-center justify-between mb-2">
              {isProfileComplete ? (
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span className="text-sm font-semibold text-green-500">Profile Complete</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-yellow-500" />
                  <span className="text-sm font-semibold text-yellow-500">
                    {profileCompletion}% Complete
                  </span>
                </div>
              )}
              <button
                onClick={() => navigate("/profile/edit")}
                className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors"
              >
                Complete Profile
              </button>
            </div>
            <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary to-accent transition-all"
                style={{ width: `${profileCompletion}%` }}
              />
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-secondary rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-primary">{stats.followers}</p>
            <p className="text-xs text-muted-foreground mt-1">Followers</p>
          </div>
          <div className="bg-secondary rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-accent">{recipes.length}</p>
            <p className="text-xs text-muted-foreground mt-1">Recipes</p>
          </div>
          <div className="bg-secondary rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-red-500">{stats.totalLikes}</p>
            <p className="text-xs text-muted-foreground mt-1">Total Likes</p>
          </div>
          <div className="bg-secondary rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-blue-500">{stats.totalComments}</p>
            <p className="text-xs text-muted-foreground mt-1">Comments</p>
          </div>
        </div>

        {/* Create Button */}
        <button
          onClick={() => navigate("/create")}
          className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Create New Recipe
        </button>

        {/* Recent Recipes */}
        <div>
          <h3 className="text-lg font-bold text-foreground mb-3">Recent Recipes</h3>
          {recipes.length > 0 ? (
            <div className="space-y-2">
              {recipes.slice(0, 5).map((recipe) => (
                <div
                  key={recipe.id}
                  onClick={() => navigate(`/recipe/${recipe.id}`)}
                  className="p-3 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-foreground text-sm">{recipe.title}</p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Heart className="w-3 h-3" /> {recipe.like_count || 0}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageSquare className="w-3 h-3" /> {recipe.comment_count || 0}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>No recipes yet</p>
              <button
                onClick={() => navigate("/create")}
                className="mt-3 text-primary font-semibold hover:opacity-80"
              >
                Create your first recipe
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreatorDashboard;