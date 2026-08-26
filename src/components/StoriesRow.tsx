import { useEffect, useState } from "react";
import { Plus, Play } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { motion } from "framer-motion";
import StoryViewer from "./StoryViewer";
import StoryCreateSheet from "./StoryCreateSheet";


interface Story {
  id: string;
  user_id: string;
  media_url: string;
  media_type: string;
  caption: string | null;
  created_at: string;
  expires_at: string;
  creator_name?: string;
 creator_avatar?: string | null;
}

interface Props {
  onStoryCreated?: () => void;
}

const StoriesRow = ({ onStoryCreated }: Props) => {
  const { user } = useAuth();
  const [stories, setStories] = useState<Story[]>([]);
  const [userProfile, setUserProfile] = useState<any>(null);
 const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [showCreateSheet, setShowCreateSheet] = useState(false);

  // Load user profile
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) {
        setUserProfile(data);
      }
    })();
  }, [user]);

  // Load other users' stories
  useEffect(() => {
    (async () => {
      try {
        const now = new Date().toISOString();
        const { data, error } = await supabase
          .from("stories")
          .select("*")
          .gt("expires_at", now)
          .order("created_at", { ascending: false })
          .limit(10);

        if (error) throw error;

        if (data && data.length > 0) {
          const userIds = [...new Set(data.map((s) => s.user_id))];
          const { data: profiles } = await supabase
            .from("profiles")
            .select("user_id, display_name, avatar_url")
            .in("user_id", userIds);

          const profileMap = new Map(
            (profiles || []).map((p) => [p.user_id, p])
          );

          const hydrated = data.map((s) => ({
            ...s,
            creator_name: profileMap.get(s.user_id)?.display_name || "Chef",
            creator_avatar: profileMap.get(s.user_id)?.avatar_url || null,
          }));

          setStories(hydrated);
        }
           } catch (error) {
        console.error("Failed to load stories:", error);
      }
    })();
  }, []);

  const handleStoryCreated = () => {
    setShowCreateSheet(false);
    onStoryCreated?.();
    // Reload stories
    (async () => {
      const now = new Date().toISOString();
      const { data } = await supabase
        .from("stories")
        .select("*")
        .gt("expires_at", now)
        .order("created_at", { ascending: false })
        .limit(10);

      if (data && data.length > 0) {
        const userIds = [...new Set(data.map((s) => s.user_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, display_name, avatar_url")
          .in("user_id", userIds);

        const profileMap = new Map(
          (profiles || []).map((p) => [p.user_id, p])
        );

        const hydrated = data.map((s) => ({
          ...s,
          creator_name: profileMap.get(s.user_id)?.display_name || "Chef",
          creator_avatar: profileMap.get(s.user_id)?.avatar_url || null,
        }));

        setStories(hydrated);
      }
    })();
  };

  const handleStoryDelete = (storyId: string) => {
    setStories(stories.filter((s) => s.id !== storyId));
    handleStoryCreated(); // Reload
  };

  return (
    <>
      <div className="flex gap-2.5 overflow-x-auto pb-3 scrollbar-hide px-6">
        {/* Your story */}
        {user && (
  <motion.button
    initial={{ opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1 }}
    onClick={() => setShowCreateSheet(true)}
    className="flex-shrink-0 flex flex-col items-center gap-2 active:scale-[0.95] transition-transform"
  >
    <div className="relative w-16 h-16">
      {userProfile?.avatar_url ? (
        <img
          src={userProfile.avatar_url}
          alt="Your story"
          className="w-16 h-16 rounded-full object-cover border-2 border-primary/30"
        />
      ) : (
        <div className="w-16 h-16 rounded-full border-2 border-primary/30 bg-secondary flex items-center justify-center text-lg font-bold text-muted-foreground">
          {(userProfile?.display_name || user.email || "?").charAt(0).toUpperCase()}
        </div>
      )}
      <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-primary flex items-center justify-center border-2 border-background">
        <Plus className="w-3.5 h-3.5 text-primary-foreground" />
      </div>
    </div>
    <span className="text-[11px] font-semibold text-foreground text-center w-16 truncate">
      Your story
    </span>
  </motion.button>
)}


        {/* Other stories */}
        {stories.map((story, i) => (
          <motion.button
            key={story.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: (i + 1) * 0.05 }}
            onClick={() => setSelectedIndex(i)}
            className="flex-shrink-0 flex flex-col items-center gap-2 active:scale-[0.95] transition-transform"
          >
            <div className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-primary/30">
  {story.media_type === "video" ? (
    <video
      src={story.media_url}
      muted
      playsInline
      preload="metadata"
      className="w-full h-full object-cover"
    />
  ) : (
    <img
      src={story.media_url}
      alt=""
      className="w-full h-full object-cover"
    />
  )}

  {story.media_type === "video" && (
    <span className="absolute bottom-1 right-1 w-5 h-5 rounded-full bg-black/50 flex items-center justify-center">
      <Play className="w-3 h-3 text-white fill-white" />
    </span>
  )}
</div>
            <span className="text-[11px] font-semibold text-foreground text-center w-16 truncate">
              {story.creator_name}
            </span>
          </motion.button>
        ))}
      </div>

      {/* Story viewer modal */}
     {selectedIndex !== null && (
  <StoryViewer
    stories={stories}
    initialIndex={selectedIndex}
    onClose={() => setSelectedIndex(null)}
    onDelete={handleStoryDelete}
  />
)}

      {/* Story create sheet */}
      <StoryCreateSheet
        open={showCreateSheet}
        onClose={() => setShowCreateSheet(false)}
        onCreated={handleStoryCreated}
      />
    </>
    
  );
};

export default StoriesRow;