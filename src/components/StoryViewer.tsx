import { X, MoreVertical } from "lucide-react";
import { useEffect, useRef, useState } from "react";
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
  creator_avatar?: string | null;
}

interface StoryViewerProps {
  stories: Story[];
  initialIndex: number;
  onClose: () => void;
  onDelete?: (storyId: string) => void;
}

const IMAGE_DURATION_MS = 5000;

const StoryViewer = ({
  stories,
  initialIndex,
  onClose,
  onDelete,
}: StoryViewerProps) => {
  const { user } = useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);

  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const current = stories[currentIndex];

  useEffect(() => {
    setProgress(0);
    setPaused(false);
    setShowMenu(false);
  }, [currentIndex]);

  // Image stories run for five seconds.
  useEffect(() => {
    if (!current || current.media_type === "video" || paused) return;

    const startedAt = performance.now() - (progress / 100) * IMAGE_DURATION_MS;

    const timer = window.setInterval(() => {
      const nextProgress = Math.min(
        ((performance.now() - startedAt) / IMAGE_DURATION_MS) * 100,
        100,
      );

      setProgress(nextProgress);

      if (nextProgress >= 100) {
        goNext();
      }
    }, 50);

    return () => window.clearInterval(timer);
  }, [current?.id, current?.media_type, paused]);

  const goNext = () => {
    if (currentIndex >= stories.length - 1) {
      onClose();
      return;
    }

    setCurrentIndex((index) => index + 1);
  };

  const goPrevious = () => {
    if (currentIndex === 0) {
      setProgress(0);
      return;
    }

    setCurrentIndex((index) => index - 1);
  };

  const pauseStory = () => {
    setPaused(true);
    videoRef.current?.pause();
  };

  const resumeStory = () => {
    setPaused(false);

    if (videoRef.current) {
      videoRef.current.play().catch(() => {});
    }
  };

  const handleDelete = async () => {
    if (!user || current?.user_id !== user.id) {
      toast.error("Can only delete your own stories");
      return;
    }

    const { error } = await supabase.from("stories").delete().eq("id", current.id);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Story deleted");
    onDelete?.(current.id);
    onClose();
  };

  if (!current) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 bg-foreground/95 flex items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <button
          onClick={onClose}
          className="absolute top-12 left-4 z-50 w-10 h-10 rounded-full bg-foreground/20 backdrop-blur-md flex items-center justify-center"
        >
          <X className="w-5 h-5 text-primary-foreground" />
        </button>

        {user?.id === current.user_id && (
          <button
            onClick={() => setShowMenu((open) => !open)}
            className="absolute top-12 right-4 z-50 w-10 h-10 rounded-full bg-foreground/20 backdrop-blur-md flex items-center justify-center"
          >
            <MoreVertical className="w-5 h-5 text-primary-foreground" />
          </button>
        )}

        {showMenu && user?.id === current.user_id && (
          <div className="absolute top-24 right-4 z-50 bg-card border border-border rounded-xl overflow-hidden shadow-lg">
            <button
              onClick={handleDelete}
              className="px-4 py-2 text-sm text-destructive hover:bg-destructive/10 font-semibold"
            >
              Delete Story
            </button>
          </div>
        )}

        <div className="relative w-full max-w-sm aspect-[9/16] rounded-2xl overflow-hidden bg-black">
          {/* Segmented progress bar */}
          <div className="absolute top-0 left-0 right-0 z-30 flex gap-1 p-3">
            {stories.map((story, index) => (
              <div
                key={story.id}
                className="h-1 flex-1 overflow-hidden rounded-full bg-white/35"
              >
                <div
                  className="h-full bg-white transition-none"
                  style={{
                    width: `${
                      index < currentIndex
                        ? 100
                        : index === currentIndex
                          ? progress
                          : 0
                    }%`,
                  }}
                />
              </div>
            ))}
          </div>

          {current.media_type === "video" ? (
           <video
  key={current.id}
  ref={videoRef}
  src={current.media_url}
  autoPlay
  muted
  playsInline
  preload="auto"
  onCanPlay={() => {
    if (!paused) {
      videoRef.current?.play().catch(() => {});
    }
  }}
  onTimeUpdate={(event) => {
    const { currentTime, duration } = event.currentTarget;
    if (Number.isFinite(duration) && duration > 0) {
      setProgress((currentTime / duration) * 100);
    }
  }}
  onEnded={goNext}
  className="w-full h-full object-contain"
/>
          ) : (
            <img
              src={current.media_url}
              alt={current.caption || "Story"}
              className="w-full h-full object-cover"
            />
          )}

          {/* Tap zones: left = previous, right = next; hold = pause */}
          <button
  aria-label="Previous story"
  className="absolute inset-y-0 left-0 z-10 w-1/2"
  onClick={goPrevious}
/>

<button
  aria-label="Next story"
  className="absolute inset-y-0 right-0 z-10 w-1/2"
  onClick={goNext}
/>

          <div className="absolute top-6 left-0 right-0 z-20 p-4 bg-gradient-to-b from-black/50 to-transparent pointer-events-none">
            <div className="flex items-center gap-3">
              {current.creator_avatar && (
                <img
                  src={current.creator_avatar}
                  alt=""
                  className="w-10 h-10 rounded-full object-cover border-2 border-white/50"
                />
              )}
              <p className="text-sm font-bold text-white">
                {current.creator_name || "Chef"}
              </p>
            </div>
          </div>

          {current.caption && (
            <div className="absolute bottom-0 left-0 right-0 z-20 p-4 bg-gradient-to-t from-black/70 to-transparent pointer-events-none">
              <p className="text-sm text-white">{current.caption}</p>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default StoryViewer;