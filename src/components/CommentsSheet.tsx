import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, Loader2, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

type CommentRow = {
  id: string;
  recipe_id: string;
  user_id: string;
  content: string;
  created_at: string;
  profile?: { display_name: string | null; username: string | null; avatar_url: string | null };
};

interface Props {
  recipeId: string | null;
  onClose: () => void;
  onCountChange?: (recipeId: string, delta: number) => void;
}

const timeAgo = (iso: string) => {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
};

const CommentsSheet = ({ recipeId, onClose, onCountChange }: Props) => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  const open = !!recipeId;

  useEffect(() => {
    if (!recipeId) return;
    setLoading(true);
    (async () => {
      const { data } = await supabase
        .from("comments")
        .select("*")
        .eq("recipe_id", recipeId)
        .order("created_at", { ascending: true });
      const rows = (data || []) as CommentRow[];
      // hydrate profiles
      const ids = Array.from(new Set(rows.map((r) => r.user_id)));
      if (ids.length) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("user_id,display_name,username,avatar_url")
          .in("user_id", ids);
        const map = new Map((profs || []).map((p: any) => [p.user_id, p]));
        rows.forEach((r) => (r.profile = map.get(r.user_id)));
      }
      setComments(rows);
      setLoading(false);
      setTimeout(() => listRef.current?.scrollTo({ top: 99999 }), 50);
    })();

    const ch = supabase
      .channel(`comments-${recipeId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "comments", filter: `recipe_id=eq.${recipeId}` },
        async (payload) => {
          const row = payload.new as CommentRow;
          const { data: prof } = await supabase
            .from("profiles")
            .select("user_id,display_name,username,avatar_url")
            .eq("user_id", row.user_id)
            .maybeSingle();
          row.profile = prof as any;
          setComments((prev) => {
            if (prev.find((c) => c.id === row.id)) return prev;
            onCountChange?.(row.recipe_id, 1);
            return [...prev, row];
          });
          setTimeout(() => listRef.current?.scrollTo({ top: 99999, behavior: "smooth" }), 50);
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "comments", filter: `recipe_id=eq.${recipeId}` },
        (payload) => setComments((prev) => {
          const existed = prev.some((c) => c.id === (payload.old as any).id);
          if (existed) onCountChange?.(recipeId, -1);
          return prev.filter((c) => c.id !== (payload.old as any).id);
        })
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [recipeId]);

  const send = async () => {
    if (authLoading) return;
    if (!user) {
      navigate("/auth");
      return;
    }
    const content = text.trim();
    if (!content || !recipeId) return;
    setSending(true);
    const { data, error } = await supabase.from("comments").insert({ recipe_id: recipeId, user_id: user.id, content }).select("*").single();
    if (error) toast.error(error.message);
    else {
      const row = data as CommentRow;
      const { data: prof } = await supabase.from("profiles").select("user_id,display_name,username,avatar_url").eq("user_id", user.id).maybeSingle();
      row.profile = prof as any;
      setComments((prev) => (prev.find((c) => c.id === row.id) ? prev : [...prev, row]));
      onCountChange?.(recipeId, 1);
      setText("");
      setTimeout(() => listRef.current?.scrollTo({ top: 99999, behavior: "smooth" }), 50);
    }
    setSending(false);
  };

  const remove = async (id: string) => {
    const row = comments.find((c) => c.id === id);
    setComments((prev) => prev.filter((c) => c.id !== id));
    if (row?.recipe_id) onCountChange?.(row.recipe_id, -1);
    const { error } = await supabase.from("comments").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      if (row) setComments((prev) => [...prev, row].sort((a, b) => +new Date(a.created_at) - +new Date(b.created_at)));
      if (row?.recipe_id) onCountChange?.(row.recipe_id, 1);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[60] bg-foreground/50 flex items-end justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="w-full max-w-lg bg-card rounded-t-3xl flex flex-col"
            style={{ height: "75vh" }}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-border/50">
              <h3 className="font-bold text-foreground">Comments {comments.length > 0 && <span className="text-muted-foreground font-normal">· {comments.length}</span>}</h3>
              <button onClick={onClose} className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                <X className="w-4 h-4 text-foreground" />
              </button>
            </div>

            <div ref={listRef} className="flex-1 overflow-y-auto px-5 py-3 space-y-4">
              {loading ? (
                <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
              ) : comments.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-10">Be the first to comment</p>
              ) : (
                comments.map((c) => (
                  <div key={c.id} className="flex gap-3">
                    {c.profile?.avatar_url ? (
                      <img src={c.profile.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-primary/20 flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-semibold text-foreground">{c.profile?.display_name || c.profile?.username || "User"}</p>
                        <span className="text-[10px] text-muted-foreground">{timeAgo(c.created_at)}</span>
                      </div>
                      <p className="text-sm text-foreground mt-0.5 break-words">{c.content}</p>
                    </div>
                    {user?.id === c.user_id && (
                      <button onClick={() => remove(c.id)} className="text-muted-foreground hover:text-destructive p-1">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="px-4 py-3 border-t border-border/50 flex items-center gap-2 pb-safe">
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send()}
                placeholder={user ? "Add a comment..." : "Sign in to comment"}
                disabled={!user}
                className="flex-1 bg-secondary rounded-full px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary"
              />
              <button
                onClick={send}
                disabled={!text.trim() || sending}
                className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-50"
              >
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CommentsSheet;
