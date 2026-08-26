import {Settings,Bookmark,Users,ChevronRight,Loader2,Heart,BadgeCheck,Film,} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import food1 from "@/assets/food-1.jpg";
import ProfileCompletionCard from "@/components/ProfileCompletionCard";
import { missingFields } from "@/lib/profile";
import { BadgeCheck } from "lucide-react";

type Recipe = { id: string; title: string; thumbnail_url: string | null };

const ProfilePage = () => {
  const navigate = useNavigate();
  const { user, isCreator } = useAuth();
  const [profile, setProfile] = useState<{ display_name: string | null; username: string | null; avatar_url: string | null; bio: string | null; specialty: string | null; country: string | null } | null>(null);
  const [myRecipesList, setMyRecipesList] = useState<Recipe[]>([]);
  const [savedRecipes, setSavedRecipes] = useState<Recipe[]>([]);
  const [subscribedRecipes, setSubscribedRecipes] = useState<Recipe[]>([]);
  const [counts, setCounts] = useState({ saved: 0, following: 0, followers: 0, recipes: 0 });
  const [tab, setTab] = useState<"saved" | "subscribed" | "mine">("saved");
  const [loading, setLoading] = useState(true);

  const loadAll = async () => {
    if (!user) return;
    const [{ data: prof }, { data: saves }, { data: follows }, { data: followers }, { data: myRecipes }] = await Promise.all([
      supabase.from("profiles").select("display_name,username,avatar_url,bio,specialty,country").eq("user_id", user.id).maybeSingle(),
      supabase.from("saves").select("recipe_id").eq("user_id", user.id),
      supabase.from("follows").select("following_id").eq("follower_id", user.id),
      supabase.from("follows").select("follower_id").eq("following_id", user.id),
      supabase.from("recipes").select("id,title,thumbnail_url").eq("creator_id", user.id).order("created_at", { ascending: false }),
    ]);

    setProfile(prof as any);
    setMyRecipesList(((myRecipes as Recipe[]) || []).slice(0, 12));

    const savedIds = (saves || []).map((s) => s.recipe_id);
    const followingIds = (follows || []).map((f) => f.following_id);

    const [{ data: savedRecipesData }, { data: subRecipesData }] = await Promise.all([
      savedIds.length
        ? supabase.from("recipes").select("id,title,thumbnail_url").in("id", savedIds).limit(12)
        : Promise.resolve({ data: [] as Recipe[] }),
      followingIds.length
        ? supabase.from("recipes").select("id,title,thumbnail_url,creator_id").in("creator_id", followingIds).order("created_at", { ascending: false }).limit(12)
        : Promise.resolve({ data: [] as Recipe[] }),
    ]);

    setSavedRecipes((savedRecipesData as Recipe[]) || []);
    setSubscribedRecipes((subRecipesData as Recipe[]) || []);
    setCounts({
      saved: saves?.length || 0,
      following: follows?.length || 0,
      followers: followers?.length || 0,
      recipes: myRecipes?.length || 0,
    });
    setLoading(false);
  };

  useEffect(() => {
    if (!user) return;
    loadAll();
    const ch = supabase
      .channel("profile-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "follows", filter: `follower_id=eq.${user.id}` }, loadAll)
      .on("postgres_changes", { event: "*", schema: "public", table: "follows", filter: `following_id=eq.${user.id}` }, loadAll)
      .on("postgres_changes", { event: "*", schema: "public", table: "saves", filter: `user_id=eq.${user.id}` }, loadAll)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const displayName = profile?.display_name || user?.user_metadata?.display_name || "User";
  const username = profile?.username || user?.email?.split("@")[0] || "user";
  const initials = displayName.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase(); 
  const complete = profile !== null && missingFields(profile, isCreator).length === 0;
  const currentList = tab === "saved" ? savedRecipes : tab === "mine" ? myRecipesList : subscribedRecipes;

  const menuItems = [
    { icon: Bookmark, label: "Saved Recipes", count: counts.saved, onClick: () => navigate("/saved") },
    { icon: Users, label: "Subscriptions", count: counts.following, onClick: () => navigate("/subscriptions") },
  ];

  return (
    <div className="min-h-screen bg-background pb-24 pt-12 px-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold font-display text-foreground">Profile</h1>
        <button
          onClick={() => navigate("/settings")}
          className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center"
        >
          <Settings className="w-4 h-4 text-foreground" />
        </button>
      </div>

      <div className="glass-card p-5 flex items-center gap-4 mb-3">
        {profile?.avatar_url ? (
          <img src={profile.avatar_url} alt={displayName} className="w-16 h-16 rounded-full object-cover" />
        ) : (
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-primary-foreground text-xl font-bold">
            {initials}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <h2 className="font-bold text-foreground truncate">{displayName}</h2>
            {isCreator && complete && (
  <BadgeCheck className="w-4 h-4 text-fresh shrink-0" />
)}
            {isCreator && <span className="text-[9px] font-bold bg-fresh/15 text-fresh px-1.5 py-0.5 rounded-full">CREATOR</span>}
          </div>
          <p className="text-xs text-muted-foreground truncate">@{username}</p>
          {profile?.bio && <p className="text-xs text-foreground/80 mt-1 line-clamp-2">{profile.bio}</p>}
        </div>
        <button
          onClick={() => navigate("/profile/edit")}
          className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold"
        >
          Edit
        </button>
      </div>

      <ProfileCompletionCard profile={profile} isCreator={isCreator} />

      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: "Recipes", value: counts.recipes },
          { label: "Following", value: counts.following },
          { label: "Followers", value: counts.followers },
        ].map((s) => (
          <div key={s.label} className="glass-card p-3 text-center">
            <p className="font-bold text-foreground">{s.value}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="space-y-2 mb-6">
        {menuItems.map((item) => (
          <button
            key={item.label}
            onClick={item.onClick}
            className="w-full glass-card p-4 flex items-center gap-3 active:scale-[0.98] transition-transform"
          >
            <div className="w-10 h-10 rounded-xl bg-light-orange flex items-center justify-center">
              <item.icon className="w-5 h-5 text-primary" />
            </div>
            <span className="flex-1 text-sm font-semibold text-foreground text-left">{item.label}</span>
            <span className="text-xs text-muted-foreground mr-2">{item.count}</span>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>
        ))}
      </div>

      {/* Profile feed: tabs for saved + subscribed */}
      <div className="flex gap-2 mb-3">
        <button
          onClick={() => setTab("saved")}
          className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all ${tab === "saved" ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"}`}
        >
          <Bookmark className="w-3.5 h-3.5 inline mr-1" /> Saved
        </button>
        <button
          onClick={() => setTab("subscribed")}
          className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all ${tab === "subscribed" ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"}`}
        >
          <Heart className="w-3.5 h-3.5 inline mr-1" /> Subscribed
        </button>
        {isCreator && (
          <button
            onClick={() => setTab("mine")}
            className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all ${tab === "mine" ? "bg-fresh text-white" : "bg-secondary text-foreground"}`}
          >
            <Film className="w-3.5 h-3.5 inline mr-1" /> My Posts
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {currentList.length === 0 ? (
            <p className="col-span-2 text-center text-xs text-muted-foreground py-8">
              {tab === "saved"
                ? "No saved recipes yet."
                : tab === "mine"
                ? "You haven't posted a recipe yet. Tap Upload Recipe to share your first dish."
                : "Subscribe to creators to see their recipes here."}
            </p>
          ) : (
            currentList.map((r) => (
              <div
                key={r.id}
                className="aspect-square rounded-2xl overflow-hidden cursor-pointer active:scale-[0.97] transition-transform relative"
                onClick={() => navigate(`/recipe/${r.id}`)}
              >
                <img src={r.thumbnail_url || food1} alt={r.title} className="w-full h-full object-cover" loading="lazy" />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-foreground/80 to-transparent p-2">
                  <p className="text-[10px] font-semibold text-primary-foreground line-clamp-2">{r.title}</p>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default ProfilePage;
