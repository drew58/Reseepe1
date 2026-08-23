-- Ensure duplicate action rows do not break persistent like/save/subscribe state
DELETE FROM public.likes a
USING public.likes b
WHERE a.id > b.id
  AND a.user_id = b.user_id
  AND a.recipe_id = b.recipe_id;

DELETE FROM public.saves a
USING public.saves b
WHERE a.id > b.id
  AND a.user_id = b.user_id
  AND a.recipe_id = b.recipe_id;

DELETE FROM public.follows a
USING public.follows b
WHERE a.id > b.id
  AND a.follower_id = b.follower_id
  AND a.following_id = b.following_id;

CREATE UNIQUE INDEX IF NOT EXISTS likes_user_recipe_unique
  ON public.likes(user_id, recipe_id);

CREATE UNIQUE INDEX IF NOT EXISTS saves_user_recipe_unique
  ON public.saves(user_id, recipe_id);

CREATE UNIQUE INDEX IF NOT EXISTS follows_follower_following_unique
  ON public.follows(follower_id, following_id);

-- Keep recipe action counters in sync
DROP TRIGGER IF EXISTS likes_count_trigger ON public.likes;
CREATE TRIGGER likes_count_trigger
AFTER INSERT OR DELETE ON public.likes
FOR EACH ROW EXECUTE FUNCTION public.bump_like_count();

DROP TRIGGER IF EXISTS saves_count_trigger ON public.saves;
CREATE TRIGGER saves_count_trigger
AFTER INSERT OR DELETE ON public.saves
FOR EACH ROW EXECUTE FUNCTION public.bump_save_count();

DROP TRIGGER IF EXISTS comments_count_trigger ON public.comments;
CREATE TRIGGER comments_count_trigger
AFTER INSERT OR DELETE ON public.comments
FOR EACH ROW EXECUTE FUNCTION public.bump_comment_count();

DROP TRIGGER IF EXISTS comments_updated_at_trigger ON public.comments;
CREATE TRIGGER comments_updated_at_trigger
BEFORE UPDATE ON public.comments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Stories for both normal users and creators
CREATE TABLE IF NOT EXISTS public.stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  media_url TEXT NOT NULL,
  media_type TEXT NOT NULL DEFAULT 'image',
  caption TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '24 hours')
);

ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Active stories viewable by everyone" ON public.stories;
CREATE POLICY "Active stories viewable by everyone"
ON public.stories
FOR SELECT
USING (expires_at > now());

DROP POLICY IF EXISTS "Users can create own stories" ON public.stories;
CREATE POLICY "Users can create own stories"
ON public.stories
FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own stories" ON public.stories;
CREATE POLICY "Users can update own stories"
ON public.stories
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own stories" ON public.stories;
CREATE POLICY "Users can delete own stories"
ON public.stories
FOR DELETE
USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS stories_user_created_idx
  ON public.stories(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS stories_active_idx
  ON public.stories(expires_at DESC)
  WHERE expires_at > '2000-01-01'::timestamptz;

ALTER PUBLICATION supabase_realtime ADD TABLE public.stories;

-- Allow signed-in users to upload story media into their own videos bucket folder
DROP POLICY IF EXISTS "Users can upload story media" ON storage.objects;
CREATE POLICY "Users can upload story media"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'videos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Users can update own story media" ON storage.objects;
CREATE POLICY "Users can update own story media"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'videos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Users can delete own story media" ON storage.objects;
CREATE POLICY "Users can delete own story media"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'videos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);