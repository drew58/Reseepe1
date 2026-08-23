
-- 1. PRIVILEGE ESCALATION FIX: remove self-insert on user_roles
DROP POLICY IF EXISTS "Users can insert their own role" ON public.user_roles;

-- 2. user_roles: restrict SELECT to owner + admins
DROP POLICY IF EXISTS "Roles viewable by everyone" ON public.user_roles;
CREATE POLICY "Users can view own roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- 3. follows: restrict SELECT to participants
DROP POLICY IF EXISTS "Follows are viewable by everyone" ON public.follows;
CREATE POLICY "Participants can view follows"
ON public.follows FOR SELECT
TO authenticated
USING (auth.uid() = follower_id OR auth.uid() = following_id);

-- 4. likes: restrict SELECT to owner
DROP POLICY IF EXISTS "Likes are viewable by everyone" ON public.likes;
CREATE POLICY "Users can view own likes"
ON public.likes FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- 5. saves: restrict SELECT to owner
DROP POLICY IF EXISTS "Saves are viewable by everyone" ON public.saves;
CREATE POLICY "Users can view own saves"
ON public.saves FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- 6. profiles: restrict SELECT to authenticated users only
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Profiles viewable by authenticated"
ON public.profiles FOR SELECT
TO authenticated
USING (true);

-- 7. Remove messages from realtime publication to prevent cross-user subscription leak
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.messages;
  END IF;
END $$;

-- 8. Revoke EXECUTE on trigger/internal functions from anon/authenticated (keep has_role usable for RLS)
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.bump_comment_count() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.bump_save_count() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.bump_like_count() FROM anon, authenticated, public;
