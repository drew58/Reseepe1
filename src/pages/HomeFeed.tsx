import { Search, MessageSquare, Heart, Bookmark, Share2, Clock, DollarSign } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import StoriesRow from "@/components/StoriesRow";
import VerifiedBadge from "@/components/VerifiedBadge";
import VideoFullScreenModal from "@/components/VideoFullScreenModal";
import CommentsSheet from "@/components/CommentsSheet";
import CreatorNav from "@/components/CreatorNav";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { getFeedCache, setFeedCache } from "@/lib/feedCache";

type Recipe = {
  id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  video_url: string | null;
  cook_time: string | null;
  cost_estimate: string | null;
  like_count: number;
  comment_count: number;
  creator_id: string;
  creator?: { display_name: string | null; username: string | null; avatar_url: string | null };
  verified?: boolean;
};

const FeedVideo = ({ src, poster, title, onFullscreen }: { src: string; poster?: string; title: string; onFullscreen?: () => void }) => {
  const ref = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && entry.intersectionRatio > 0.5) {
          el.play().catch(() => {});
        } else {
          el.pause();
        }
      },
      { threshold: [0.5] }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div 
      className="relative w-full aspect-[9/14] cursor-pointer group bg-secondary rounded-lg overflow-hidden"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onFullscreen?.();
        }
      }}
    >
      <video
        ref={ref}
        src={src}
        poster={poster}
        muted={muted}
        loop
        playsInline
        preload="metadata"
        onClick={(e) => {
          e.stopPropagation();
          setMuted(!muted);
        }}
        className="w-full h-full object-cover"
        aria-label={title}
      />
      
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-foreground/60 via-transparent to-transparent pointer-events-none" />

      {/* Creator info - top left */}
      {/* Empty - will show below video */}

      {/* Title + cook time + cost - bottom */}
      {/* Empty - will show below video */}
    </div>
  );
};

const HomeFeed = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [recipes, setRecipes] = useState<Recipe[]>(() => getFeedCache<Recipe>());
  const [loading, setLoading] = useState(() => getFeedCache<Recipe>().length === 0);
  const [likedRecipes, setLikedRecipes] = useState<Set<string>>(new Set());
  const [savedRecipes, setSavedRecipes] = useState<Set<string>>(new Set());
  const [fullscreenVideo, setFullscreenVideo] = useState<string | null>(null);
  const [fullscreenTitle, setFullscreenTitle] = useState("");
  const [commentRecipeId, setCommentRecipeId] = useState<string | null>(null);
  const [firstComment, setFirstComment] = useState<Record<string, any>>({});

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("recipes")
        .select("*")
        .eq("post_type", "post")
        .order("created_at", { ascending: false })
        .limit(20);

      const rows = (data || []) as any[];
      const cIds = Array.from(new Set(rows.map((r) => r.creator_id)));

      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id,display_name,username,avatar_url")
        .in("user_id", cIds.length ? cIds : ["00000000-0000-0000-0000-000000000000"]);

      const { data: fcs } = await supabase.from("featured_creators" as any).select("username,verified");

      const profMap = new Map((profs || []).map((p: any) => [p.user_id, p]));
      const fcMap = new Map((fcs as any[] || []).map((f: any) => [f.username, f]));

      const enriched = rows.map((r) => {
        const p = profMap.get(r.creator_id);
        const fc = p?.username ? fcMap.get(p.username) : null;
        return { ...r, creator: p, verified: !!fc?.verified };
      });

      // Load first comment for each recipe
      for (const recipe of enriched) {
        const { data: comments } = await supabase
          .from("comments")
          .select("*, user:profiles(display_name, avatar_url)")
          .eq("recipe_id", recipe.id)
          .order("created_at", { ascending: true })
          .limit(1);
        if (comments && comments.length > 0) {
          setFirstComment((prev) => ({ ...prev, [recipe.id]: comments[0] }));
        }
      }

      setRecipes(enriched);
      setFeedCache(enriched);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: likes }, { data: saves }] = await Promise.all([
        supabase.from("likes").select("recipe_id").eq("user_id", user.id),
        supabase.from("saves").select("recipe_id").eq("user_id", user.id),
      ]);
      setLikedRecipes(new Set((likes || []).map((l) => l.recipe_id)));
      setSavedRecipes(new Set((saves || []).map((s) => s.recipe_id)));
    })();
  }, [user]);

  const toggleLike = async (id: string, isLiked: boolean) => {
    if (!user) return navigate("/auth");
    const next = !isLiked;
    const newLiked = new Set(likedRecipes);
    if (next) newLiked.add(id);
    else newLiked.delete(id);
    setLikedRecipes(newLiked);

    if (next) {
      await supabase.from("likes").insert({ user_id: user.id, recipe_id: id });
    } else {
      await supabase.from("likes").delete().eq("user_id", user.id).eq("recipe_id", id);
    }
  };

  const toggleSave = async (id: string, isSaved: boolean) => {
    if (!user) return navigate("/auth");
    const next = !isSaved;
    const newSaved = new Set(savedRecipes);
    if (next) newSaved.add(id);
    else newSaved.delete(id);
    setSavedRecipes(newSaved);

    if (next) {
      await supabase.from("saves").insert({ user_id: user.id, recipe_id: id });
    } else {
      await supabase.from("saves").delete().eq("user_id", user.id).eq("recipe_id", id);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-lg px-4 py-4">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <h1 className="text-2xl font-bold font-display">
            <span className="text-primary">RE</span>
            <span className="text-fresh">SEE</span>
            <span className="text-primary">PE</span>
          </h1>
          <div className="flex gap-2">
            <button className="w-10 h-10 rounded-full bg-secondary hover:bg-secondary/80 flex items-center justify-center transition-colors" onClick={() => navigate("/messages")}>
              <MessageSquare className="w-5 h-5 text-foreground" />
            </button>
            <button className="w-10 h-10 rounded-full bg-secondary hover:bg-secondary/80 flex items-center justify-center transition-colors" onClick={() => navigate("/search")}>
              <Search className="w-5 h-5 text-foreground" />
            </button>
          </div>
        </div>
      </div>

      {/* Stories */}
      <div className="py-3 border-b border-border/30">
        <StoriesRow />
      </div>

      {/* Feed */}
      <div className="max-w-2xl mx-auto px-4 space-y-8 pt-4">
        {loading && (
          <div className="flex justify-center py-12">
            <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        )}

        {recipes.map((r, idx) => (
          <motion.div
            key={r.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: idx * 0.1 }}
          >
            {/* Creator + Video */}
            <div>
              {/* Creator info */}
              {r.creator?.avatar_url && (
                <div 
                  className="flex items-center gap-2 mb-3 cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => navigate(`/creator/${r.creator?.username}`)}
                >
                  <img src={r.creator.avatar_url} alt={r.creator.display_name} className="w-8 h-8 rounded-full object-cover" />
                  <div className="flex items-center gap-1">
                    <span className="text-sm font-semibold text-foreground">{r.creator.display_name}</span>
                    {r.verified && <VerifiedBadge size="sm" />}
                  </div>
                </div>
              )}

              {/* Video/Image */}
              {r.video_url ? (
                <FeedVideo 
                  src={r.video_url} 
                  poster={r.thumbnail_url || undefined} 
                  title={r.title}
                  onFullscreen={() => {
                    setFullscreenVideo(r.video_url);
                    setFullscreenTitle(r.title);
                  }}
                />
              ) : r.thumbnail_url ? (
                <img 
                  src={r.thumbnail_url} 
                  alt={r.title} 
                  className="w-full aspect-[9/14] object-cover rounded-lg"
                />
              ) : (
                <div className="w-full aspect-[9/14] bg-secondary rounded-lg" />
              )}
            </div>

            {/* Title + Cook Time + Cost */}
            <div className="mt-3">
              <h2 className="text-base font-bold text-foreground mb-1">{r.title}</h2>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {r.cook_time && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {r.cook_time}
                  </span>
                )}
                {r.cost_estimate && (
                  <span className="flex items-center gap-1">
                    <DollarSign className="w-3 h-3" /> {r.cost_estimate}
                  </span>
                )}
              </div>
            </div>

            {/* Stats + Action Buttons */}
            <div className="flex items-center justify-between mt-3">
              <div className="flex gap-4">
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => toggleLike(r.id, likedRecipes.has(r.id))}
                  className="flex items-center gap-1"
                >
                  <Heart className={`w-5 h-5 ${likedRecipes.has(r.id) ? "fill-red-500 text-red-500" : "text-foreground"}`} />
                  <span className="text-xs text-muted-foreground">{r.like_count}</span>
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setCommentRecipeId(r.id)}
                  className="flex items-center gap-1"
                >
                  <MessageSquare className="w-5 h-5 text-foreground" />
                  <span className="text-xs text-muted-foreground">{r.comment_count}</span>
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => toggleSave(r.id, savedRecipes.has(r.id))}
                  className="flex items-center gap-1"
                >
                  <Bookmark className={`w-5 h-5 ${savedRecipes.has(r.id) ? "fill-primary text-primary" : "text-foreground"}`} />
                  <span className="text-xs text-muted-foreground">0</span>
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex items-center gap-1"
                >
                  <Share2 className="w-5 h-5 text-foreground" />
                </motion.button>
              </div>

              {/* View Recipe Button */}
              <button
                onClick={() => navigate(`/recipe/${r.id}`)}
                className="px-4 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors"
              >
                View Recipe
              </button>
            </div>

            {/* Caption */}
            {r.description && (
              <div className="mt-2">
                <p className="text-xs text-foreground line-clamp-2">{r.description}</p>
              </div>
            )}

            {/* First Comment */}
            {firstComment[r.id] && (
              <div className="mt-3">
                <div className="flex gap-2">
                  {firstComment[r.id].user?.avatar_url && (
                    <img 
                      src={firstComment[r.id].user.avatar_url} 
                      alt={firstComment[r.id].user.display_name} 
                      className="w-5 h-5 rounded-full object-cover flex-shrink-0"
                    />
                  )}
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-foreground">
                      {firstComment[r.id].user?.display_name || "Anonymous"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">{firstComment[r.id].content}</p>
                  </div>
                </div>
              </div>
            )}

            {/* View Comments Link */}
            {r.comment_count > 0 && (
              <button
                onClick={() => setCommentRecipeId(r.id)}
                className="text-xs text-muted-foreground mt-2 hover:text-foreground transition-colors"
              >
                View all {r.comment_count} comments
              </button>
            )}
          </motion.div>
        ))}

        {!loading && recipes.length === 0 && (
          <div className="text-center py-20">
            <p className="text-muted-foreground text-sm">No recipes yet</p>
          </div>
        )}
      </div>

      {/* Fullscreen video modal */}
      <VideoFullScreenModal
        src={fullscreenVideo}
        title={fullscreenTitle}
        onClose={() => setFullscreenVideo(null)}
      />

      {/* Comments sheet */}
      <CommentsSheet
        recipeId={commentRecipeId}
        onClose={() => setCommentRecipeId(null)}
      />

      {/* Creator button */}
      <CreatorNav />
    </div>
  );
};

export default HomeFeed;