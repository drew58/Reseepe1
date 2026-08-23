import { X, MoreVertical } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface Story {
  id: string;
  user_id: string;
  media_url: string;
  media_type: string;
  caption: string | null;
  creator_name?: string;
  creator_avatar?: string;
}

interface StoryViewerProps {
  story: Story | null;
  onClose: () => void;
  onDelete?: (storyId: string) => void;
}

const StoryViewer = ({ story, onClose, onDelete }: StoryViewerProps) => {
  const { user } = useAuth();
  const [showMenu, setShowMenu] = useState(false);

  const handleDelete = async () => {
    if (!user || story?.user_id !== user.id) {
      toast.error("Can only delete your own stories");
      return;
    }

    const { error } = await supabase.from("stories").delete().eq("id", story!.id);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Story deleted");
      onDelete?.(story!.id);
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {story && (
        <motion.div
          className="fixed inset-0 z-50 bg-foreground/95 flex flex-col items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-12 left-4 z-50 w-10 h-10 rounded-full bg-foreground/20 backdrop-blur-md flex items-center justify-center hover:bg-foreground/30 transition-colors"
          >
            <X className="w-5 h-5 text-primary-foreground" />
          </button>

          {/* More menu button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            className="absolute top-12 right-4 z-50 w-10 h-10 rounded-full bg-foreground/20 backdrop-blur-md flex items-center justify-center hover:bg-foreground/30 transition-colors"
          >
            <MoreVertical className="w-5 h-5 text-primary-foreground" />
          </button>

          {/* Delete menu */}
          {showMenu && user?.id === story.user_id && (
            <motion.div
              className="absolute top-16 right-4 z-50 bg-card border border-border rounded-xl overflow-hidden shadow-lg"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={handleDelete}
                className="w-full px-4 py-2 text-sm text-destructive hover:bg-destructive/10 text-left font-semibold"
              >
                Delete Story
              </button>
            </motion.div>
          )}

          {/* Story content */}
          <div
            className="relative w-full max-w-sm aspect-[9/16] rounded-2xl overflow-hidden bg-foreground/5"
            onClick={(e) => e.stopPropagation()}
          >
            {story.media_type === "image" ? (
              <img
                src={story.media_url}
                alt={story.caption || "Story"}
                className="w-full h-full object-cover"
              />
            ) : (
              <video
                src={story.media_url}
                controls
                autoPlay
                className="w-full h-full object-cover"
              />
            )}

            {/* Creator info overlay */}
            <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-foreground/40 to-transparent">
              <div className="flex items-center gap-3">
                {story.creator_avatar && (
                  <img
                    src={story.creator_avatar}
                    alt={story.creator_name}
                    className="w-10 h-10 rounded-full object-cover border-2 border-primary-foreground/50"
                  />
                )}
                <p className="text-sm font-bold text-primary-foreground">
                  {story.creator_name || "Chef"}
                </p>
              </div>
            </div>

            {/* Caption overlay */}
            {story.caption && (
              <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-foreground/60 to-transparent">
                <p className="text-sm text-primary-foreground">{story.caption}</p>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default StoryViewer;