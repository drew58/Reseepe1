import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Heart, Bookmark, Share2, Clock, DollarSign, ChefHat, MessageCircle, Loader2, ImageOff } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { persistLike, persistSave } from "@/lib/recipeActions";
import { convertCurrency, parseCostAmount, getCurrencySymbol } from "@/lib/currency";
import { toast } from "sonner";
import CommentsSheet from "@/components/CommentsSheet";
import ShareSheet from "@/components/ShareSheet";

const RecipeDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();
  const [recipe, setRecipe] = useState<any | null>(null);
  const [loading, setLoading] = useState(!!id);
  const [activeTab, setActiveTab] = useState<"ingredients" | "steps">("ingredients");
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [userCurrency, setUserCurrency] = useState("USD");

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data } = await supabase.from("recipes").select("*").eq("id", id).maybeSingle();
      setRecipe(data);
      setLoading(false);
    })();
  }, [id]);

  // Load user's currency preference
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("currency")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data?.currency) {
        setUserCurrency(data.currency);
      }
    })();
  }, [user]);

  useEffect(() => {
    if (!user || !id) return;
    (async () => {
      const [{ data: like }, { data: save }] = await Promise.all([
        supabase.from("likes").select("id").eq("user_id", user.id).eq("recipe_id", id).maybeSingle(),
        supabase.from("saves").select("id").eq("user_id", user.id).eq("recipe_id", id).maybeSingle(),
      ]);
      setLiked(!!like);
      setSaved(!!save);
    })();
  }, [user, id]);

  const toggleLike = async () => {
    if (!user || !id) return navigate("/auth");
    const next = !liked;
    setLiked(next);
    setRecipe((r: any) =>
      r ? { ...r, like_count: Math.max(0, (r.like_count || 0) + (next ? 1 : -1)) } : r
    );
    const { error } = await persistLike(user.id, id, next);
    if (error) {
      setLiked(!next);
      setRecipe((r: any) =>
        r ? { ...r, like_count: Math.max(0, (r.like_count || 0) + (next ? -1 : 1)) } : r
      );
      toast.error(error.message);
    }
  };

  const toggleSave = async () => {
    if (!user || !id) return navigate("/auth");
    const next = !saved;
    setSaved(next);
    const { error } = await persistSave(user.id, id, next);
    if (error) {
      setSaved(!next);
      toast.error(error.message);
    } else if (next) toast.success("Saved");
  };

  // Convert cost to viewer's currency (assuming all costs are originally in USD)
  const getConvertedCost = () => {
    if (!recipe?.cost_estimate) return "";
    const amount = parseCostAmount(recipe.cost_estimate);
    if (!amount) return recipe.cost_estimate;
    // Assume all stored costs are in USD
    return convertCurrency(amount, "USD", userCurrency);
  };

  const recipeIngredients: string[] = recipe?.ingredients?.length ? recipe.ingredients : [];
  const recipeSteps: string[] = recipe?.steps?.length ? recipe.steps : [];
  const hasMedia = !!(recipe?.thumbnail_url || recipe?.video_url);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!recipe) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 text-center">
        <ImageOff className="w-8 h-8 text-muted-foreground/40 mb-3" />
        <p className="text-sm text-muted-foreground">This recipe couldn't be found.</p>
        <button
          onClick={() => navigate("/home")}
          className="mt-4 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold"
        >
          Back to feed
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Media */}
      <div className="relative h-[45vh] bg-secondary">
        {hasMedia ? (
          <img
            src={recipe.thumbnail_url || recipe.video_url}
            alt={recipe.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageOff className="w-8 h-8 text-muted-foreground/30" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-foreground/20" />
        <button
          onClick={() => navigate(-1)}
          className="absolute top-12 left-4 w-10 h-10 rounded-full bg-card/80 backdrop-blur-md flex items-center justify-center"
        >
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <div className="absolute top-12 right-4 flex gap-2">
          <button
            onClick={toggleLike}
            className="w-10 h-10 rounded-full bg-card/80 backdrop-blur-md flex items-center justify-center"
          >
            <Heart className={`w-5 h-5 ${liked ? "fill-red-500 text-red-500" : "text-foreground"}`} />
          </button>
          <button
            onClick={() => setCommentsOpen(true)}
            className="w-10 h-10 rounded-full bg-card/80 backdrop-blur-md flex items-center justify-center"
          >
            <MessageCircle className="w-5 h-5 text-foreground" />
          </button>
          <button
            onClick={toggleSave}
            className="w-10 h-10 rounded-full bg-card/80 backdrop-blur-md flex items-center justify-center"
          >
            <Bookmark className={`w-5 h-5 ${saved ? "fill-primary text-primary" : "text-foreground"}`} />
          </button>
          <button
            onClick={() => setShareOpen(true)}
            className="w-10 h-10 rounded-full bg-card/80 backdrop-blur-md flex items-center justify-center"
          >
            <Share2 className="w-5 h-5 text-foreground" />
          </button>
        </div>
      </div>

      {/* Content */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="px-5 -mt-8 relative z-10"
      >
        <div className="glass-card p-5">
          <h1 className="text-xl font-bold font-display text-foreground">{recipe.title}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {recipe.like_count || 0} likes • {recipe.comment_count || 0} comments
          </p>

          {/* Stats — pulled from real recipe fields, with currency conversion */}
          {(recipe.cook_time || getConvertedCost()) && (
            <div className="flex gap-4 mt-4">
              {recipe.cook_time && (
                <div className="flex flex-col items-center gap-1">
                  <div className="w-10 h-10 rounded-xl bg-light-orange flex items-center justify-center">
                    <Clock className="w-4 h-4 text-primary" />
                  </div>
                  <span className="text-[10px] text-muted-foreground font-medium">{recipe.cook_time}</span>
                </div>
              )}
             {getConvertedCost() && (
  <div className="flex flex-col items-center gap-1">
    <div className="w-10 h-10 rounded-xl bg-light-orange flex items-center justify-center">
      <span className="text-sm font-bold text-primary">{getCurrencySymbol(userCurrency)}</span>
    </div>
    <span className="text-[10px] text-muted-foreground font-medium">{getConvertedCost()}</span>
  </div>
)}
              {recipe.tags && recipe.tags.length > 0 && (
                <div className="flex flex-col items-center gap-1">
                  <div className="w-10 h-10 rounded-xl bg-light-orange flex items-center justify-center">
                    <ChefHat className="w-4 h-4 text-primary" />
                  </div>
                  <span className="text-[10px] text-muted-foreground font-medium">{recipe.tags[0]}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mt-5 bg-secondary rounded-2xl p-1">
          {(["ingredients", "steps"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2.5 rounded-xl text-xs font-semibold capitalize transition-all ${
                activeTab === tab ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="mt-4">
          {activeTab === "ingredients" && (
            <div className="space-y-2.5">
              {recipeIngredients.length > 0 ? (
                recipeIngredients.map((name, i) => (
                  <div key={`${name}-${i}`} className="flex items-center py-2 px-3 rounded-xl bg-card border border-border/50">
                    <span className="text-sm text-foreground">{name}</span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">No ingredients listed yet.</p>
              )}
            </div>
          )}

          {activeTab === "steps" && (
            <div className="space-y-4">
              {recipeSteps.length > 0 ? (
                recipeSteps.map((step, i) => (
                  <div key={i} className="flex gap-3">
                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-bold text-primary">{i + 1}</span>
                    </div>
                    <p className="text-sm text-foreground leading-relaxed">{step}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">No steps listed yet.</p>
              )}
            </div>
          )}
        </div>
      </motion.div>
      <CommentsSheet
        recipeId={commentsOpen ? id || null : null}
        onClose={() => setCommentsOpen(false)}
        onCountChange={(_, delta) =>
          setRecipe((r: any) =>
            r ? { ...r, comment_count: Math.max(0, (r.comment_count || 0) + delta) } : r
          )
        }
      />
      {!commentsOpen && (
        <ShareSheet
          recipe={shareOpen && id ? { id, title: recipe?.title || "Recipe" } : null}
          onClose={() => setShareOpen(false)}
        />
      )}
    </div>
  );
};

export default RecipeDetail;