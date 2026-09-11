-- Keep exactly one counter trigger per action so counts cannot jump twice.
DROP TRIGGER IF EXISTS trg_like_count ON public.likes;
DROP TRIGGER IF EXISTS likes_count_trigger ON public.likes;
DROP TRIGGER IF EXISTS trg_save_count ON public.saves;
DROP TRIGGER IF EXISTS saves_count_trigger ON public.saves;
DROP TRIGGER IF EXISTS trg_comment_count ON public.comments;
DROP TRIGGER IF EXISTS comments_count_trigger ON public.comments;

CREATE TRIGGER likes_count_trigger
AFTER INSERT OR DELETE ON public.likes
FOR EACH ROW EXECUTE FUNCTION public.bump_like_count();

CREATE TRIGGER saves_count_trigger
AFTER INSERT OR DELETE ON public.saves
FOR EACH ROW EXECUTE FUNCTION public.bump_save_count();

CREATE TRIGGER comments_count_trigger
AFTER INSERT OR DELETE ON public.comments
FOR EACH ROW EXECUTE FUNCTION public.bump_comment_count();

UPDATE public.recipes AS recipe
SET
  like_count = (SELECT count(*) FROM public.likes WHERE recipe_id = recipe.id),
  save_count = (SELECT count(*) FROM public.saves WHERE recipe_id = recipe.id),
  comment_count = (SELECT count(*) FROM public.comments WHERE recipe_id = recipe.id);