import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Copy, Loader2, Send, Share2, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { shareRecipe } from "@/lib/recipeActions";

type ShareTarget = { user_id: string; display_name: string | null; username: string | null; avatar_url: string | null };

interface Props {
  recipe: { id: string; title: string } | null;
  onClose: () => void;
}

const ShareSheet = ({ recipe, onClose }: Props) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [targets, setTargets] = useState<ShareTarget[]>([]);
  const [sendingTo, setSendingTo] = useState<string | null>(null);
  const open = !!recipe;

  useEffect(() => {
    if (!open || !user) return;
    (async () => {
      const { data: follows } = await supabase.from("follows").select("following_id").eq("follower_id", user.id).limit(20);
      const ids = (follows || []).map((f) => f.following_id);
      if (!ids.length) return setTargets([]);
      const { data } = await supabase
        .from("profiles")
        .select("user_id,display_name,username,avatar_url")
        .in("user_id", ids);
      setTargets((data as ShareTarget[]) || []);
    })();
  }, [open, user]);

  const sendDm = async (target: ShareTarget) => {
    if (!user || !recipe) return navigate("/auth");
    setSendingTo(target.user_id);
    const link = `${window.location.origin}/recipe/${recipe.id}`;
    const { error } = await supabase.from("messages").insert({
      sender_id: user.id,
      recipient_id: target.user_id,
      content: `Shared a recipe: ${recipe.title}\n${link}`,
    });
    setSendingTo(null);
    if (error) toast.error(error.message);
    else {
      toast.success(`Sent to ${target.display_name || target.username || "friend"}`);
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {open && recipe && (
        <motion.div className="fixed inset-0 z-[60] bg-foreground/50 flex items-end justify-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <motion.div className="w-full max-w-lg bg-card rounded-t-3xl" initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 28, stiffness: 320 }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-border/50">
              <h3 className="font-bold text-foreground">Share recipe</h3>
              <button onClick={onClose} className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-4 space-y-3 pb-safe">
              <button onClick={() => shareRecipe(recipe.id, recipe.title)} className="w-full flex items-center gap-3 p-3 rounded-2xl bg-secondary text-left">
                <Share2 className="w-5 h-5 text-primary" />
                <span className="text-sm font-semibold text-foreground">Share outside RESEEPE</span>
              </button>
              <button onClick={async () => { await navigator.clipboard.writeText(`${window.location.origin}/recipe/${recipe.id}`); toast.success("Link copied"); }} className="w-full flex items-center gap-3 p-3 rounded-2xl bg-secondary text-left">
                <Copy className="w-5 h-5 text-primary" />
                <span className="text-sm font-semibold text-foreground">Copy link</span>
              </button>
              {user && targets.length > 0 && (
                <div className="pt-2">
                  <p className="text-xs font-semibold text-muted-foreground px-1 mb-2">Send to a friend</p>
                  <div className="max-h-56 overflow-y-auto space-y-1">
                    {targets.map((t) => (
                      <button key={t.user_id} onClick={() => sendDm(t)} className="w-full flex items-center gap-3 p-2 rounded-2xl hover:bg-secondary text-left">
                        {t.avatar_url ? <img src={t.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" /> : <div className="w-10 h-10 rounded-full bg-primary/20" />}
                        <span className="flex-1 text-sm font-semibold text-foreground truncate">{t.display_name || t.username || "User"}</span>
                        {sendingTo === t.user_id ? <Loader2 className="w-4 h-4 animate-spin text-primary" /> : <Send className="w-4 h-4 text-primary" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ShareSheet;