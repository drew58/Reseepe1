import { ArrowLeft, Bookmark } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import food1 from "@/assets/food-1.jpg";

type Recipe = {
  id: string;
  title: string;
  thumbnail_url: string | null;
  cook_time: string | null;
};

const SavedRecipesPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    (async () => {
      const { data: saves } = await supabase.from("saves").select("recipe_id").eq("user_id", user.id);
      const ids = (saves || []).map((s) => s.recipe_id);
      if (ids.length === 0) {
        setRecipes([]);
        setLoading(false);
        return;
      }
      const { data } = await supabase.from("recipes").select("id,title,thumbnail_url,cook_time").in("id", ids);
      setRecipes((data as Recipe[]) || []);
      setLoading(false);
    })();
  }, [user]);

  return (
    <div className="min-h-screen bg-background pb-24 pt-12 px-4">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center">
          <ArrowLeft className="w-4 h-4 text-foreground" />
        </button>
        <h1 className="text-xl font-bold font-display text-foreground">Saved Recipes</h1>
      </div>

      {loading ? (
        <p className="text-center text-muted-foreground py-12">Loading…</p>
      ) : recipes.length === 0 ? (
        <div className="text-center py-16">
          <Bookmark className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">No saved recipes yet</p>
          <p className="text-muted-foreground/70 text-xs mt-1">Tap the bookmark on any recipe to save it here</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {recipes.map((r) => (
            <button
              key={r.id}
              onClick={() => navigate(`/recipe/${r.id}`)}
              className="text-left active:scale-[0.97] transition-transform"
            >
              <div className="aspect-square rounded-2xl overflow-hidden mb-2">
                <img src={r.thumbnail_url || food1} alt={r.title} className="w-full h-full object-cover" loading="lazy" />
              </div>
              <h3 className="text-xs font-semibold text-foreground line-clamp-2">{r.title}</h3>
              {r.cook_time && <p className="text-[10px] text-muted-foreground mt-0.5">{r.cook_time}</p>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default SavedRecipesPage;
