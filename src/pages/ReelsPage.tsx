import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Volume2, VolumeX } from "lucide-react";
import { Heart, MessageCircle, Bookmark, Share2, ArrowLeft, Loader2, BookOpen, Play } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import VerifiedBadge from "@/components/VerifiedBadge";
import CommentsSheet from "@/components/CommentsSheet";
import ShareSheet from "@/components/ShareSheet";
import { getFeedCache, setFeedCache } from "@/lib/feedCache";
import { persistLike, persistSave } from "@/lib/recipeActions";

type Reel = {
  id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  video_url: string | null;
  cook_time: string | null;
  cost_estimate: string | null;
  like_count: number;
  comment_count: number;
  save_count: number;
  creator_id: string;
  creator?: { display_name: string | null; username: string | null; avatar_url: string | null };
  verified?: boolean;
  country?: string | null;
};

const PAGE = 5;

const ReelsPage = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [params] = useSearchParams();
  const startId = params.get("id");

  const [reels, setReels] = useState<Reel[]>(() => getFeedCache<Reel>());
  const [loading, setLoading] = useState(() => getFeedCache<Reel>().length === 0);
  const [done, setDone] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const [likedSet, setLikedSet] = useState<Set<string>>(new Set());
  const [savedSet, setSavedSet] = useState<Set<string>>(new Set());
  const [commentFor, setCommentFor] = useState<string | null>(null);
  const [shareFor, setShareFor] = useState<Reel | null>(null);
  const [paused, setPaused] = useState<Record<string, boolean>>({});
  const [muted, setMuted] = useState(true);

  const containerRef = useRef<HTMLDivElement>(null);
  const videoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());

  const hydrate = useCallback(async (rows: any[]) => {
    if (rows.length === 0) return [];
    const cIds = Array.from(new Set(rows.map((r) => r.creator_id)));
    const [{ data: profs }, { data: fcs }] = await Promise.all([
      supabase.from("profiles").select("user_id,display_name,username,avatar_url").in("user_id", cIds),
      supabase.from("featured_creators" as any).select("username,verified,country"),
    ]);
    const profMap = new Map((profs || []).map((p: any) => [p.user_id, p]));
    const fcMap = new Map((fcs as any[] || []).map((f: any) => [f.username, f]));
    return rows.map((r) => {
      const p = profMap.get(r.creator_id);
      const fc = p?.username ? fcMap.get(p.username) : null;
      return { ...r, creator: p, verified: !!fc?.verified, country: fc?.country || null } as Reel;
    });
  }, []);

  const loadMore = useCallback(async () => {
    if (loading || done) return;
    setLoading(true);
    const { data } = await supabase
      .from("recipes")
      .select("*")
      .order("created_at", { ascending: false })
      .range(reels.length, reels.length + PAGE - 1);
    const rows = (data || []) as any[];
    if (rows.length < PAGE) setDone(true);
    const enriched = await hydrate(rows);
    setReels((prev) => {
      const next = [...prev, ...enriched];
      setFeedCache(next);
      return next;
    });
    setLoading(false);
  }, [loading, done, reels.length, hydrate]);

  // Initial: load and put startId first
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("recipes")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(PAGE);
      let rows = (data || []) as any[];
      if (startId) {
        const idx = rows.findIndex((r) => r.id === startId);
        if (idx === -1) {
          const { data: extra } = await supabase.from("recipes").select("*").eq("id", startId).maybeSingle();
          if (extra) rows = [extra, ...rows];
        } else if (idx > 0) {
          rows = [rows[idx], ...rows.slice(0, idx), ...rows.slice(idx + 1)];
        }
      }
      const enriched = await hydrate(rows);
      setReels(enriched);
      setFeedCache(enriched);
      if (rows.length < PAGE) setDone(true);
      setLoading(false);
    })();
  }, [hydrate, startId]);

  // Load user likes/saves
  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: likes }, { data: saves }] = await Promise.all([
        supabase.from("likes").select("recipe_id").eq("user_id", user.id),
        supabase.from("saves").select("recipe_id").eq("user_id", user.id),
      ]);
      setLikedSet(new Set((likes || []).map((l) => l.recipe_id)));
      setSavedSet(new Set((saves || []).map((s) => s.recipe_id)));
    })();
  }, [user]);

  // IntersectionObserver: which reel is active
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting && e.intersectionRatio > 0.65) {
            const idx = Number((e.target as HTMLElement).dataset.idx);
            setActiveIdx(idx);
            // infinite scroll trigger
            if (idx >= reels.length - 2) loadMore();
          }
        });
      },
      { root: el, threshold: [0.65] }
    );
    el.querySelectorAll("[data-reel]").forEach((c) => obs.observe(c));
    return () => obs.disconnect();
  }, [reels.length, loadMore]);

  // Autoplay active video, pause others
  useEffect(() => {
    videoRefs.current.forEach((v, id) => {
      const idx = reels.findIndex((r) => r.id === id);
      if (idx === activeIdx && !paused[id]) {
        v.play().catch(() => {});
      } else {
        v.pause();
      }
    });
  }, [activeIdx, reels, paused]);

  const toggleLike = async (r: Reel) => {
    if (authLoading) return;
    if (!user) return navigate("/auth");
    const liked = likedSet.has(r.id);
    setLikedSet((p) => {
      const n = new Set(p);
      liked ? n.delete(r.id) : n.add(r.id);
      return n;
    });
    setReels((prev) => prev.map((x) => (x.id === r.id ? { ...x, like_count: x.like_count + (liked ? -1 : 1) } : x)));
    const { error } = await persistLike(user.id, r.id, !liked);
    if (error) {
      setLikedSet((p) => {
        const n = new Set(p);
        liked ? n.add(r.id) : n.delete(r.id);
        return n;
      });
      setReels((prev) => prev.map((x) => (x.id === r.id ? { ...x, like_count: Math.max(0, x.like_count + (liked ? 1 : -1)) } : x)));
      toast.error(error.message);
    }
  };

  const toggleSave = async (r: Reel) => {
    if (authLoading) return;
    if (!user) return navigate("/auth");
    const saved = savedSet.has(r.id);
    setSavedSet((p) => {
      const n = new Set(p);
      saved ? n.delete(r.id) : n.add(r.id);
      return n;
    });
    setReels((prev) => prev.map((x) => (x.id === r.id ? { ...x, save_count: x.save_count + (saved ? -1 : 1) } : x)));
    const { error } = await persistSave(user.id, r.id, !saved);
    if (error) {
      setSavedSet((p) => {
        const n = new Set(p);
        saved ? n.add(r.id) : n.delete(r.id);
        return n;
      });
      setReels((prev) => prev.map((x) => (x.id === r.id ? { ...x, save_count: Math.max(0, x.save_count + (saved ? 1 : -1)) } : x)));
      toast.error(error.message);
    } else if (!saved) {
      toast.success("Saved");
    }
  };

  const bumpCommentCount = (recipeId: string, delta: number) => {
    setReels((prev) => prev.map((x) => (x.id === recipeId ? { ...x, comment_count: Math.max(0, x.comment_count + delta) } : x)));
  };

  return (
    <div className="fixed inset-x-0 top-0 bottom-16 bg-black z-30 max-w-lg mx-auto">
      <button
        onClick={() => navigate(-1)}
        className="absolute top-12 left-4 z-30 w-10 h-10 rounded-full bg-foreground/30 backdrop-blur-md flex items-center justify-center"
      >
        <ArrowLeft className="w-5 h-5 text-primary-foreground" />
      </button>
      <button
        onClick={() => {
          setMuted((m) => {
            const nm = !m;
            videoRefs.current.forEach((v) => { v.muted = nm; });
            const activeId = reels[activeIdx]?.id;
            const av = activeId ? videoRefs.current.get(activeId) : null;
            if (av && !nm) av.play().catch(() => {});
            return nm;
          });
        }}
        className="absolute top-12 right-4 z-30 w-10 h-10 rounded-full bg-foreground/30 backdrop-blur-md flex items-center justify-center"
        aria-label={muted ? "Unmute" : "Mute"}
      >
        {muted ? <VolumeX className="w-5 h-5 text-primary-foreground" /> : <Volume2 className="w-5 h-5 text-primary-foreground" />}
      </button>

      <div
        ref={containerRef}
        className="h-full overflow-y-scroll snap-y snap-mandatory scrollbar-hide"
        style={{ scrollSnapType: "y mandatory" }}
      >
        {reels.map((r, i) => {
          const liked = likedSet.has(r.id);
          const saved = savedSet.has(r.id);
          return (
            <div key={r.id} data-reel data-idx={i} className="h-full w-full snap-start relative flex items-end" style={{ minHeight: "100%" }}>
              {r.video_url ? (
                <video
                  ref={(el) => {
                    if (el) videoRefs.current.set(r.id, el);
                    else videoRefs.current.delete(r.id);
                  }}
                  src={r.video_url}
                  poster={r.thumbnail_url || undefined}
                  loop
                  muted={muted}
                  playsInline
                  onClick={() => {
                    if (muted) {
                      setMuted(false);
                      const v = videoRefs.current.get(r.id);
                      if (v) { v.muted = false; v.play().catch(() => {}); }
                      return;
                    }
                    setPaused((p) => ({ ...p, [r.id]: !p[r.id] }));
                  }}
                  className="absolute inset-0 w-full h-full object-cover"
                />
              ) : r.thumbnail_url ? (
                <img src={r.thumbnail_url} alt={r.title} className="absolute inset-0 w-full h-full object-cover" />
              ) : (
                <div className="absolute inset-0 bg-secondary" />
              )}

              {paused[r.id] && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-20 h-20 rounded-full bg-foreground/40 backdrop-blur-md flex items-center justify-center">
                    <Play className="w-9 h-9 text-primary-foreground fill-current ml-1" />
                  </div>
                </div>
              )}

              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent pointer-events-none" />

              {/* Right action rail */}
              <div className="absolute right-3 bottom-6 flex flex-col gap-5 z-20">
                <button onClick={(e) => { e.stopPropagation(); toggleLike(r); }} className="flex flex-col items-center gap-1">
                  <Heart className={`w-7 h-7 ${liked ? "fill-red-500 text-red-500" : "text-white"}`} />
                  <span className="text-[11px] text-white font-semibold">{r.like_count}</span>
                </button>
                <button onClick={(e) => { e.stopPropagation(); setCommentFor(r.id); }} className="flex flex-col items-center gap-1">
                  <MessageCircle className="w-7 h-7 text-white" />
                  <span className="text-[11px] text-white font-semibold">{r.comment_count}</span>
                </button>
                <button onClick={(e) => { e.stopPropagation(); toggleSave(r); }} className="flex flex-col items-center gap-1">
                  <Bookmark className={`w-7 h-7 ${saved ? "fill-white text-white" : "text-white"}`} />
                  <span className="text-[11px] text-white font-semibold">{r.save_count}</span>
                </button>
                <button onClick={(e) => { e.stopPropagation(); setShareFor(r); }} className="flex flex-col items-center gap-1">
                  <Share2 className="w-7 h-7 text-white" />
                </button>
              </div>

              {/* Bottom info */}
              <div className="relative z-10 p-5 pr-20 pb-6 w-full">
                <button
                  onClick={() => r.creator?.username && navigate(`/creator/${r.creator.username}`)}
                  className="flex items-center gap-2 mb-2"
                >
                  {r.creator?.avatar_url && (
                    <img src={r.creator.avatar_url} alt="" className="w-9 h-9 rounded-full border-2 border-white object-cover" />
                  )}
                  <span className="text-white font-semibold text-sm">@{r.creator?.username || "creator"}</span>
                  {r.verified && <VerifiedBadge size="sm" />}
                </button>
                <h2 className="text-white font-bold text-lg leading-tight">{r.title}</h2>
                {r.description && <p className="text-white/80 text-xs mt-1 line-clamp-2">{r.description}</p>}
                <div className="flex items-center gap-2 mt-2 text-[11px] text-white/80">
                  {r.cook_time && <span>⏱ {r.cook_time}</span>}
                  {r.cost_estimate && <span>💰 {r.cost_estimate}</span>}
                  {r.country && <span>{r.country}</span>}
                </div>
                <button
                  onClick={() => navigate(`/recipe/${r.id}`)}
                  className="mt-3 inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-primary text-primary-foreground text-xs font-semibold"
                >
                  <BookOpen className="w-3.5 h-3.5" /> View Recipe
                </button>
              </div>
            </div>
          );
        })}

        {loading && (
          <div className="h-32 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-primary-foreground" />
          </div>
        )}
        {done && reels.length > 0 && (
          <div className="h-32 flex items-center justify-center text-white/60 text-sm">You're all caught up</div>
        )}
        {!loading && reels.length === 0 && (
          <div className="h-screen flex items-center justify-center text-white/70 text-sm">No reels yet</div>
        )}
      </div>

      <CommentsSheet recipeId={commentFor} onClose={() => setCommentFor(null)} onCountChange={bumpCommentCount} />
      <ShareSheet recipe={shareFor ? { id: shareFor.id, title: shareFor.title } : null} onClose={() => setShareFor(null)} />
    </div>
  );
};

export default ReelsPage;
