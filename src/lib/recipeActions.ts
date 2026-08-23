import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const persistLike = async (userId: string, recipeId: string, liked: boolean) => {
  if (liked) {
    return supabase.from("likes").upsert({ user_id: userId, recipe_id: recipeId }, { onConflict: "user_id,recipe_id" });
  }
  return supabase.from("likes").delete().eq("user_id", userId).eq("recipe_id", recipeId);
};

export const persistSave = async (userId: string, recipeId: string, saved: boolean) => {
  if (saved) {
    return supabase.from("saves").upsert({ user_id: userId, recipe_id: recipeId }, { onConflict: "user_id,recipe_id" });
  }
  return supabase.from("saves").delete().eq("user_id", userId).eq("recipe_id", recipeId);
};

export const shareRecipe = async (recipeId: string, title: string) => {
  const url = `${window.location.origin}/recipe/${recipeId}`;
  try {
    if (navigator.share) {
      await navigator.share({ title, text: `Check out ${title} on RESEEPE`, url });
      return;
    }
    await navigator.clipboard.writeText(url);
    toast.success("Share link copied");
  } catch (error: any) {
    if (error?.name !== "AbortError") toast.error("Could not share this recipe");
  }
};