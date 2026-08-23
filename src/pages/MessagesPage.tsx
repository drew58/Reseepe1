import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, MessageSquare, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

type Convo = {
  other_id: string;
  last_content: string;
  last_at: string;
  unread: boolean;
  profile?: { display_name: string | null; username: string | null; avatar_url: string | null };
};

const timeAgo = (iso: string) => {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "now";
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
};

const MessagesPage = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [convos, setConvos] = useState<Convo[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("messages")
      .select("*")
      .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
      .order("created_at", { ascending: false })
      .limit(200);
    const rows = (data || []) as any[];
    const seen = new Set<string>();
    const out: Convo[] = [];
    for (const m of rows) {
      const other = m.sender_id === user.id ? m.recipient_id : m.sender_id;
      if (seen.has(other)) continue;
      seen.add(other);
      out.push({
        other_id: other,
        last_content: m.content,
        last_at: m.created_at,
        unread: m.recipient_id === user.id && !m.read_at,
      });
    }
    if (out.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id,display_name,username,avatar_url")
        .in("user_id", out.map((c) => c.other_id));
      const map = new Map((profs || []).map((p: any) => [p.user_id, p]));
      out.forEach((c) => (c.profile = map.get(c.other_id)));
    }
    setConvos(out);
    setLoading(false);
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate("/auth");
      return;
    }
    load();
    const ch = supabase
      .channel("messages-list")
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading]);

  return (
    <div className="min-h-screen bg-background pb-24 pt-12">
      <div className="px-4 flex items-center gap-3 mb-4">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center">
          <ArrowLeft className="w-4 h-4 text-foreground" />
        </button>
        <h1 className="text-xl font-bold font-display text-foreground">Messages</h1>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : convos.length === 0 ? (
        <div className="text-center py-20 px-6">
          <MessageSquare className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No conversations yet</p>
          <p className="text-xs text-muted-foreground/70 mt-1">Tap "Message" on any creator profile to start chatting</p>
        </div>
      ) : (
        <div className="px-2">
          {convos.map((c) => (
            <button
              key={c.other_id}
              onClick={() => navigate(`/messages/${c.other_id}`)}
              className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-secondary transition-colors text-left"
            >
              {c.profile?.avatar_url ? (
                <img src={c.profile.avatar_url} alt="" className="w-12 h-12 rounded-full object-cover flex-shrink-0" />
              ) : (
                <div className="w-12 h-12 rounded-full bg-primary/20 flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-foreground truncate">
                    {c.profile?.display_name || c.profile?.username || "User"}
                  </p>
                  <span className="text-[10px] text-muted-foreground flex-shrink-0 ml-2">{timeAgo(c.last_at)}</span>
                </div>
                <p className={`text-xs truncate mt-0.5 ${c.unread ? "text-foreground font-semibold" : "text-muted-foreground"}`}>
                  {c.last_content}
                </p>
              </div>
              {c.unread && <div className="w-2.5 h-2.5 rounded-full bg-primary flex-shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default MessagesPage;
