import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const CreatorNav = () => {
  const navigate = useNavigate();
  const { isCreator, loading } = useAuth();

  if (loading || !isCreator) return null;

  return (
    <button
      onClick={() => navigate("/create")}
      className="fixed bottom-24 right-6 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-colors flex items-center justify-center z-30"
      aria-label="Create recipe"
    >
      <Plus className="w-6 h-6" />
    </button>
  );
};

export default CreatorNav;