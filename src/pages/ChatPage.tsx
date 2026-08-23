import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Send, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

type Msg = { id: string; sender_id: string; recipient_id: string; content: string; created_at: string; read_at: string | null };
type Profile = { user_id: string; display_name: string | null; username: string | null; avatar_url: string | null };

const ChatPage = () => {
  const navigate = useNavigate();
  const { otherId } = useParams<{ otherId: string }>();
  const { user, loading: authLoading } = useAuth();
  const [other, setOther] = useState<Profile | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate("/auth");
      return;
    }
    if (!otherId) return;
    (async () => {
      const [{ data: prof }, { data: msgs }] = await Promise.all([
        supabase.from("profiles").select("user_id,display_name,username,avatar_url").eq("user_id", otherId).maybeSingle(),
        supabase
          .from("messages")
          .select("*")
          .or(`and(sender_id.eq.${user.id},recipient_id.eq.${otherId}),and(sender_id.eq.${otherId},recipient_id.eq.${user.id})`)
          .order("created_at", { ascending: true }),
      ]);
      setOther(prof as Profile);
      setMessages((msgs || []) as Msg[]);
      setLoading(false);

      // Mark inbound as read
      await supabase
        .from("messages")
        .update({ read_at: new Date().toISOString() })
        .eq("sender_id", otherId)
        .eq("recipient_id", user.id)
        .is("read_at", null);
    })();

    const ch = supabase
      .channel(`chat-${otherId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const m = payload.new as Msg;
          if (
            (m.sender_id === user.id && m.recipient_id === otherId) ||
            (m.sender_id === otherId && m.recipient_id === user.id)
          ) {
            setMessages((prev) => (prev.find((x) => x.id === m.id) ? prev : [...prev, m]));
            if (m.recipient_id === user.id) {
              supabase.from("messages").update({ read_at: new Date().toISOString() }).eq("id", m.id);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otherId, user, authLoading]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    if (!user || !otherId) return;
    const content = text.trim();
    if (!content) return;
    setSending(true);
    setText("");
    const { data, error } = await supabase
      .from("messages")
      .insert({ sender_id: user.id, recipient_id: otherId, content })
      .select("*")
      .single();
    if (error) {
      toast.error(error.message);
      setText(content);
    } else if (data) {
      const m = data as Msg;
      setMessages((prev) => (prev.find((x) => x.id === m.id) ? prev : [...prev, m]));
    }
    setSending(false);
  };

  return (
    <div className="h-[100dvh] bg-background flex flex-col overflow-hidden">
      <div className="flex-shrink-0 z-10 bg-background/95 backdrop-blur-xl pt-12 pb-3 px-4 flex items-center gap-3 border-b border-border/50">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center">
          <ArrowLeft className="w-4 h-4 text-foreground" />
        </button>
        {other?.avatar_url ? (
          <img src={other.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />
        ) : (
          <div className="w-10 h-10 rounded-full bg-primary/20" />
        )}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-foreground truncate">{other?.display_name || "User"}</p>
          <p className="text-[11px] text-muted-foreground">@{other?.username}</p>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-2">
        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
        ) : messages.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-10">Say hi 👋</p>
        ) : (
          messages.map((m) => {
            const mine = m.sender_id === user?.id;
            return (
              <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm break-words ${
                    mine ? "bg-primary text-primary-foreground rounded-br-md" : "bg-secondary text-foreground rounded-bl-md"
                  }`}
                >
                  {m.content}
                </div>
              </div>
            );
          })
        )}
        <div ref={endRef} />
      </div>

      <div className="flex-shrink-0 px-3 pt-3 border-t border-border/50 bg-background flex items-center gap-2 pb-safe">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Message..."
          className="flex-1 bg-secondary rounded-full px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary"
        />
        <button
          onClick={send}
          disabled={!text.trim() || sending}
          className="w-11 h-11 rounded-full bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-50"
        >
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
};

export default ChatPage;
