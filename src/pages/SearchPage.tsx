import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Clock, DollarSign, ChefHat, X, Loader2, Filter, ArrowLeft, ListFilter } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import food1 from "@/assets/food-1.jpg";
import food2 from "@/assets/food-2.jpg";
import food3 from "@/assets/food-3.jpg";
import food5 from "@/assets/food-5.jpg";
import food6 from "@/assets/food-6.jpg";

const fallbackImages = [food1, food2, food3, food5, food6];
const categories = ["All", "Nigerian", "Italian", "Asian", "Mexican", "Indian", "Ghanaian", "Desserts", "Healthy"];
const popularIngredients = [
  "Rice","Eggs","Chicken","Pepper","Onion","Tomato","Garlic","Pasta","Cheese","Butter",
  "Olive Oil","Salt","Sugar","Flour","Milk","Salmon","Avocado","Lemon","Ginger","Soy Sauce",
  "Tortilla","Beans","Corn","Cilantro","Lime","Beef","Shrimp","Spinach","Yam","Plantain",
];

type SortKey = "relevance" | "cheapest" | "fastest" | "fewest";
type IngredientStep = "picking" | "results";

interface RecipeRow {
  id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  cook_time: string | null;
  cost_estimate: string | null;
  ingredients: string[] | null;
  tags: string[] | null;
  creator_id: string;
  creator_name?: string;
  match?: number;
}

const parseNum = (s: string | null | undefined) => {
  if (!s) return Infinity;
  const m = s.match(/\d+(\.\d+)?/);
  return m ? parseFloat(m[0]) : Infinity;
};

const SearchPage = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"meal" | "ingredients">("meal");
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [sort, setSort] = useState<SortKey>("relevance");
  const [selectedIngredients, setSelectedIngredients] = useState<string[]>([]);
  const [ingredientSearch, setIngredientSearch] = useState("");
  const [ingredientStep, setIngredientStep] = useState<IngredientStep>("picking");
  const [results, setResults] = useState<RecipeRow[]>([]);
  const [loading, setLoading] = useState(false);

  const filteredIngredients = popularIngredients.filter((i) =>
    i.toLowerCase().includes(ingredientSearch.toLowerCase())
  );

  const toggleIngredient = (ing: string) => {
    setSelectedIngredients((p) => p.includes(ing) ? p.filter((i) => i !== ing) : [...p, ing]);
  };

  const hydrateCreators = async (rows: any[]): Promise<RecipeRow[]> => {
    const ids = [...new Set(rows.map((r) => r.creator_id))];
    if (!ids.length) return [];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, display_name, username")
      .in("user_id", ids);
    const map = new Map((profiles ?? []).map((p) => [p.user_id, p.display_name || p.username || "Chef"]));
    return rows.map((r) => ({ ...r, creator_name: map.get(r.creator_id) ?? "Chef" }));
  };

  const runDbSearch = async () => {
    setLoading(true);
    try {
      let q = supabase.from("recipes").select("*").limit(40);
      if (mode === "meal" && query.trim()) {
        q = q.or(`title.ilike.%${query}%,description.ilike.%${query}%`);
      }
      if (mode === "meal" && activeCategory !== "All") {
        q = q.contains("tags", [activeCategory.toLowerCase()]);
      }
      if (mode === "ingredients" && selectedIngredients.length) {
        q = q.overlaps("ingredients", selectedIngredients);
      }
      const { data, error } = await q;
      if (error) throw error;
      const hydrated = await hydrateCreators(data ?? []);

      if (mode === "ingredients" && selectedIngredients.length) {
        hydrated.forEach((r) => {
          const ing = (r.ingredients ?? []).map((x) => x.toLowerCase());
          const have = selectedIngredients.filter((s) => ing.some((i) => i.includes(s.toLowerCase()))).length;
          r.match = Math.round((have / selectedIngredients.length) * 100);
        });
      }
      setResults(hydrated);
    } catch (e: any) {
      toast.error(e.message ?? "Search failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (mode !== "meal") return;
    runDbSearch();
    // eslint-disable-next-line
  }, [mode]);

  useEffect(() => {
    if (mode !== "meal") return;
    const t = setTimeout(() => { runDbSearch(); }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line
  }, [query, activeCategory]);

  const handleFindRecipes = async () => {
    if (selectedIngredients.length === 0) return;
    setIngredientStep("results");
    await runDbSearch();
  };

  const handleEditIngredients = () => {
    setIngredientStep("picking");
  };

  const sorted = useMemo(() => {
    const arr = [...results];
    if (sort === "cheapest") arr.sort((a, b) => parseNum(a.cost_estimate) - parseNum(b.cost_estimate));
    else if (sort === "fastest") arr.sort((a, b) => parseNum(a.cook_time) - parseNum(b.cook_time));
    else if (sort === "fewest") arr.sort((a, b) => (a.ingredients?.length ?? 99) - (b.ingredients?.length ?? 99));
    else if (mode === "ingredients") arr.sort((a, b) => (b.match ?? 0) - (a.match ?? 0));
    return arr;
  }, [results, sort, mode]);

  const renderResultCard = (r: RecipeRow, i: number) => (
    <motion.div
      key={r.id}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(i, 8) * 0.04 }}
      className="glass-card p-3 flex gap-3 cursor-pointer active:scale-[0.98] transition-transform"
      onClick={() => navigate(`/recipe/${r.id}`)}
    >
      <div className="relative flex-shrink-0">
        <img
          src={r.thumbnail_url || fallbackImages[i % fallbackImages.length]}
          alt={r.title}
          className="w-20 h-20 rounded-xl object-cover"
          loading="lazy"
        />
        {r.match != null && (
          <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[9px] font-bold px-1.5 py-0.5 rounded-full">{r.match}%</span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-bold text-sm text-foreground truncate">{r.title}</h3>
        <p className="text-xs text-muted-foreground mt-0.5 truncate">by {r.creator_name}</p>
        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
          {r.cook_time && <span className="flex items-center gap-1 text-[10px] text-muted-foreground"><Clock className="w-3 h-3" />{r.cook_time}</span>}
          {r.cost_estimate && <span className="flex items-center gap-1 text-[10px] text-muted-foreground"><DollarSign className="w-3 h-3" />{r.cost_estimate}</span>}
          {r.ingredients && <span className="flex items-center gap-1 text-[10px] text-muted-foreground"><ChefHat className="w-3 h-3" />{r.ingredients.length} items</span>}
        </div>
      </div>
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-background pb-24 pt-12 px-4">
      {/* Mode toggle */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setMode("meal")}
          className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${mode === "meal" ? "bg-primary text-primary-foreground shadow-md shadow-primary/20" : "bg-secondary text-foreground"}`}
        >Search by Meal</button>
        <button
          onClick={() => { setMode("ingredients"); setIngredientStep("picking"); }}
          className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${mode === "ingredients" ? "bg-primary text-primary-foreground shadow-md shadow-primary/20" : "bg-secondary text-foreground"}`}
        >By Ingredients</button>
      </div>

      {/* ───────────────────── MEAL MODE ───────────────────── */}
      {mode === "meal" && (
        <>
          <div className="relative mb-3">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search recipes by name or description..."
              className="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-card border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-hide mb-2">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`flex-shrink-0 px-4 py-2 rounded-full text-xs font-semibold transition-all ${activeCategory === cat ? "bg-foreground text-background" : "bg-secondary text-foreground"}`}
              >{cat}</button>
            ))}
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-3 scrollbar-hide mb-3">
            <Filter className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
            {([
              ["relevance", "Best match"],
              ["cheapest", "Cheapest"],
              ["fastest", "Fastest"],
              ["fewest", "Few ingredients"],
            ] as const).map(([k, label]) => (
              <button
                key={k}
                onClick={() => setSort(k)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all ${sort === k ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"}`}
              >{label}</button>
            ))}
          </div>

          {loading && (
            <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
          )}

          <div className="space-y-3">{sorted.map((r, i) => renderResultCard(r, i))}</div>

          {!loading && sorted.length === 0 && (
            <div className="text-center py-12 text-muted-foreground text-sm">
              No recipes match your search yet.
            </div>
          )}
        </>
      )}

      {/* ───────────────── INGREDIENTS MODE — STEP 1: PICKING ───────────────── */}
      {mode === "ingredients" && ingredientStep === "picking" && (
        <>
          <div className="relative mb-3">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={ingredientSearch}
              onChange={(e) => setIngredientSearch(e.target.value)}
              placeholder="Find an ingredient..."
              className="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-card border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <AnimatePresence>
            {selectedIngredients.length > 0 && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="mb-3 overflow-hidden">
                <div className="flex flex-wrap gap-1.5">
                  {selectedIngredients.map((ing) => (
                    <span key={ing} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/15 text-primary text-xs font-semibold">
                      {ing}
                      <button onClick={() => toggleIngredient(ing)}><X className="w-3 h-3" /></button>
                    </span>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="grid grid-cols-2 gap-1 mb-3">
            {filteredIngredients.slice(0, 20).map((ing) => (
              <label key={ing} className="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-secondary/50 cursor-pointer">
                <Checkbox checked={selectedIngredients.includes(ing)} onCheckedChange={() => toggleIngredient(ing)} />
                <span className="text-sm text-foreground">{ing}</span>
              </label>
            ))}
          </div>

          <button
            onClick={handleFindRecipes}
            disabled={selectedIngredients.length === 0}
            className="w-full py-3.5 rounded-2xl bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-primary/25 active:scale-[0.98] transition-transform disabled:opacity-40"
          >
            <Search className="w-4 h-4" />
            {selectedIngredients.length === 0
              ? "Select ingredients to continue"
              : `Find recipes with ${selectedIngredients.length} ingredient${selectedIngredients.length > 1 ? "s" : ""}`}
          </button>
        </>
      )}

      {/* ───────────────── INGREDIENTS MODE — STEP 2: RESULTS ───────────────── */}
      {mode === "ingredients" && ingredientStep === "results" && (
        <>
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={handleEditIngredients}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-foreground"
            >
              <ArrowLeft className="w-4 h-4" /> Edit ingredients
            </button>
            <button
              onClick={handleEditIngredients}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary text-xs font-semibold text-foreground"
            >
              <ListFilter className="w-3.5 h-3.5" /> {selectedIngredients.length} selected
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5 mb-4">
            {selectedIngredients.map((ing) => (
              <span key={ing} className="px-2.5 py-1 rounded-full bg-primary/15 text-primary text-xs font-semibold">
                {ing}
              </span>
            ))}
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-3 scrollbar-hide mb-3">
            <Filter className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
            {([
              ["relevance", "Best match"],
              ["cheapest", "Cheapest"],
              ["fastest", "Fastest"],
              ["fewest", "Few ingredients"],
            ] as const).map(([k, label]) => (
              <button
                key={k}
                onClick={() => setSort(k)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all ${sort === k ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"}`}
              >{label}</button>
            ))}
          </div>

          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
          ) : (
            <>
              <h2 className="text-sm font-semibold text-foreground mb-3">
                {sorted.length > 0
                  ? `${sorted.length} recipe${sorted.length > 1 ? "s" : ""} found`
                  : "No recipes found"}
              </h2>

              {sorted.length > 0 ? (
                <div className="space-y-3">{sorted.map((r, i) => renderResultCard(r, i))}</div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-sm text-muted-foreground mb-4">
                    No recipes use those ingredients yet. Try removing one or two, or check back as more recipes get added.
                  </p>
                  <button
                    onClick={handleEditIngredients}
                    className="px-5 py-2.5 rounded-2xl bg-primary text-primary-foreground text-sm font-semibold"
                  >
                    Adjust ingredients
                  </button>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
};

export default SearchPage;