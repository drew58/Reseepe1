import { useNavigate } from "react-router-dom";
import { ChevronRight, ShieldCheck } from "lucide-react";
import { fieldLabels, missingFields, profileCompletion, type ProfileLike } from "@/lib/profile";

interface Props {
  profile: ProfileLike;
  isCreator: boolean;
}

/**
 * Shown to both users and creators until every required profile field is set.
 * Completing it awards the green verification tick.
 */
const ProfileCompletionCard = ({ profile, isCreator }: Props) => {
  const navigate = useNavigate();
  const missing = missingFields(profile, isCreator);
  if (missing.length === 0) return null;

  const pct = profileCompletion(profile, isCreator);

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
            {isCreator
              ? "Creators get the verified tick once the profile is complete."
              : "Finish setting up to earn your verified tick."}
          </p>
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
      </div>

      <div className="mt-3 h-1.5 rounded-full bg-secondary overflow-hidden">
        <div className="h-full bg-fresh rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>
      <div className="flex items-center justify-between mt-2">
        <p className="text-[10px] text-muted-foreground">
          Missing: {missing.map((m) => fieldLabels[m] || m).join(", ")}
        </p>
        <span className="text-[10px] font-bold text-fresh">{pct}%</span>
      </div>
    </button>
  );
};

export default ProfileCompletionCard;
