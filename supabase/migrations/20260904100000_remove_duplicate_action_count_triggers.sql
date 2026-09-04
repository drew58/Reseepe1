-- Keep one database trigger per action counter. The earlier migration created
-- trg_* triggers, then a later migration created the canonical *_trigger names.
DROP TRIGGER IF EXISTS trg_like_count ON public.likes;
DROP TRIGGER IF EXISTS trg_save_count ON public.saves;
DROP TRIGGER IF EXISTS trg_comment_count ON public.comments;

-- Recompute counters once so existing rows remain correct after duplicate
-- triggers have been removed.
UPDATE public.recipes AS recipe
SET
  like_count = (SELECT count(*) FROM public.likes WHERE recipe_id = recipe.id),
  save_count = (SELECT count(*) FROM public.saves WHERE recipe_id = recipe.id),
  comment_count = (SELECT count(*) FROM public.comments WHERE recipe_id = recipe.id);
