import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, ShieldCheck, CheckCircle2 } from "lucide-react";
import { fieldLabels, missingFields, profileCompletion, type ProfileLike } from "@/lib/profile";

interface Props {
  profile: ProfileLike | null;
  isCreator: boolean;
}

const ProfileCompletionCard = ({ profile, isCreator }: Props) => {
  const navigate = useNavigate();
  const missing = missingFields(profile, isCreator);
  const pct = profileCompletion(profile, isCreator);
  const complete = profile != null && missing.length === 0;
  const [showDone, setShowDone] = useState(false);

  useEffect(() => {
    if (!complete) return;
    const key = "reseepe-profile-complete-popup";
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
    setShowDone(true);
    const t = setTimeout(() => setShowDone(false), 2200);
    return () => clearTimeout(t);
  }, [complete]);

  if (complete) {
    return showDone ? (
      <div className="glass-card p-4 mb-3 flex items-center gap-3 border border-fresh/30 animate-in fade-in slide-in-from-top-1">
        <div className="w-10 h-10 rounded-xl bg-fresh/10 flex items-center justify-center shrink-0">
          <CheckCircle2 className="w-5 h-5 text-fresh" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">Profile 100% complete</p>
          <p className="text-[11px] text-muted-foreground">Verified tick unlocked.</p>
        </div>
        <span className="text-[10px] font-bold text-fresh">100%</span>
      </div>
    ) : null;
  }

  return (
    <button
      onClick={() => navigate("/profile/edit")}
      className="w-full glass-card p-4 mb-3 text-left active:scale-[0.98] transition-transform border border-fresh/30"
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-fresh/10 flex items-center justify-center shrink-0">
          <ShieldCheck className="w-5 h-5 text-fresh" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">Complete your profile</p>
          <p className="text-[11px] text-muted-foreground">
            {isCreator ? "Creators get the verified tick once the profile is complete." : "Finish setting up to earn your verified tick."}
          </p>
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
      </div>
      <div className="mt-3 h-1.5 rounded-full bg-secondary overflow-hidden">
        <div className="h-full bg-fresh rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>
      <div className="flex items-center justify-between mt-2">
        <p className="text-[10px] text-muted-foreground">Missing: {missing.map((m) => fieldLabels[m] || m).join(", ")}</p>
        <span className="text-[10px] font-bold text-fresh">{pct}%</span>
      </div>
    </button>
  );
};

export default ProfileCompletionCard;