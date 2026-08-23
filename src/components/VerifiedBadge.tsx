import { BadgeCheck } from "lucide-react";

interface VerifiedBadgeProps {
  size?: "sm" | "md";
  className?: string;
}

// Reseepe verified — classic starburst badge (lucide BadgeCheck), bolder stroke
const VerifiedBadge = ({ size = "sm", className = "" }: VerifiedBadgeProps) => {
  const dim = size === "sm" ? "w-[18px] h-[18px]" : "w-[22px] h-[22px]";
  return (
    <BadgeCheck
      className={`${dim} ${className} drop-shadow-sm`}
      style={{ color: "hsl(142 65% 40%)" }}
      strokeWidth={2.75}
      fill="hsl(142 65% 40%)"
      stroke="white"
      aria-label="Verified"
    />
  );
};

export default VerifiedBadge;
