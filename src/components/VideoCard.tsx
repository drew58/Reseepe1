import { Heart, MessageCircle, Bookmark, Share2, Play, Lock } from "lucide-react";
import { useState } from "react";
import VerifiedBadge from "@/components/VerifiedBadge";

interface VideoCardProps {
  image: string;
  title: string;
  creator: string;
  creatorCountry?: string;
  likes: string;
  tags: string[];
  avatar?: string;
  verified?: boolean;
  locked?: boolean;
  onClick?: () => void;
  onCreatorClick?: () => void;
}

const tagStyles: Record<string, string> = {
  "Low cost": "tag-low-cost",
  "Quick meal": "tag-quick",
  "Few ingredients": "tag-few-ingredients",
};

const VideoCard = ({ image, title, creator, creatorCountry, likes, tags, avatar, verified, locked, onClick, onCreatorClick }: VideoCardProps) => {
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);

  return (
    <div className="relative w-full aspect-[9/14] rounded-3xl overflow-hidden group cursor-pointer" onClick={onClick}>
      <img src={image} alt={title} className={`w-full h-full object-cover ${locked ? "blur-[3px]" : ""}`} />
      
      {/* Lock overlay for premium */}
      {locked && (
        <div className="absolute inset-0 bg-foreground/40 flex flex-col items-center justify-center z-10">
          <div className="w-14 h-14 rounded-full bg-primary/90 flex items-center justify-center mb-2">
            <Lock className="w-6 h-6 text-primary-foreground" />
          </div>
          <p className="text-primary-foreground text-xs font-semibold">Subscribe to unlock</p>
        </div>
      )}

      {/* Play icon */}
      {!locked && (
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="w-16 h-16 rounded-full bg-foreground/20 backdrop-blur-md flex items-center justify-center">
            <Play className="w-7 h-7 text-primary-foreground fill-current ml-1" />
          </div>
        </div>
      )}

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 via-foreground/10 to-transparent" />

      {/* Tags */}
      <div className="absolute top-4 left-4 flex flex-wrap gap-1.5">
        {tags.map((tag) => (
          <span key={tag} className={tagStyles[tag] || "tag-badge bg-card/80 text-foreground"}>
            {tag}
          </span>
        ))}
      </div>

      {/* Creator avatar - top right corner */}
      {avatar && (
        <button
          className="absolute top-4 right-4 z-20"
          onClick={(e) => { e.stopPropagation(); onCreatorClick?.(); }}
        >
          <div className="relative">
            <img
              src={avatar}
              alt={creator}
              className="w-10 h-10 rounded-full object-cover border-2 border-primary-foreground/80 shadow-lg"
            />
            {verified && (
              <div className="absolute -bottom-0.5 -right-0.5">
                <VerifiedBadge size="sm" />
              </div>
            )}
          </div>
        </button>
      )}

      {/* Right actions */}
      {!locked && (
        <div className="absolute right-3 bottom-24 flex flex-col gap-5">
          <button onClick={(e) => { e.stopPropagation(); setLiked(!liked); }} className="flex flex-col items-center gap-1">
            <Heart className={`w-6 h-6 ${liked ? "fill-red-500 text-red-500" : "text-primary-foreground"}`} />
            <span className="text-[10px] text-primary-foreground font-medium">{likes}</span>
          </button>
          <button onClick={(e) => e.stopPropagation()} className="flex flex-col items-center gap-1">
            <MessageCircle className="w-6 h-6 text-primary-foreground" />
            <span className="text-[10px] text-primary-foreground font-medium">42</span>
          </button>
          <button onClick={(e) => { e.stopPropagation(); setSaved(!saved); }} className="flex flex-col items-center gap-1">
            <Bookmark className={`w-6 h-6 ${saved ? "fill-primary-foreground text-primary-foreground" : "text-primary-foreground"}`} />
          </button>
          <button onClick={(e) => e.stopPropagation()} className="flex flex-col items-center gap-1">
            <Share2 className="w-6 h-6 text-primary-foreground" />
          </button>
        </div>
      )}

      {/* Bottom info */}
      <div className="absolute bottom-4 left-4 right-16 z-10">
        <h3 className="text-primary-foreground font-bold text-lg leading-tight">{title}</h3>
        <div className="flex items-center gap-1 mt-1">
          <p className="text-primary-foreground/80 text-sm">@{creator}</p>
          {verified && <VerifiedBadge size="sm" />}
        </div>
        {creatorCountry && (
          <p className="text-primary-foreground/60 text-xs mt-0.5">{creatorCountry}</p>
        )}
      </div>
    </div>
  );
};

export default VideoCard;
