-- Keep recipe comment counters correct for existing and future comments.
DROP TRIGGER IF EXISTS trg_comment_count ON public.comments;
DROP TRIGGER IF EXISTS comments_count_trigger ON public.comments;

CREATE TRIGGER comments_count_trigger
AFTER INSERT OR DELETE ON public.comments
FOR EACH ROW EXECUTE FUNCTION public.bump_comment_count();

UPDATE public.recipes AS recipe
SET comment_count = (
  SELECT count(*)
  FROM public.comments
  WHERE comments.recipe_id = recipe.id
);