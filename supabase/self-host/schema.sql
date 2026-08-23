-- ============================================================
-- RESEEPE — full schema for a self-hosted Supabase project
-- Run once in your own project: SQL Editor -> paste -> Run
-- Safe to re-run (idempotent).
-- ============================================================

-- ---------- 1. Roles enum + user_roles (creator / user / admin) ----------
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'creator', 'user');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- ---------- 2. Shared updated_at trigger ----------
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

-- ---------- 3. Profiles (incl. creator fields) ----------
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  display_name text,
  username text,
  avatar_url text,
  bio text,
  role text NOT NULL DEFAULT 'user',
  subscription_tier text NOT NULL DEFAULT 'free',
  favorite_cuisines text[] NOT NULL DEFAULT '{}',
  continent text,
  preferences_set boolean NOT NULL DEFAULT false,
  specialty text,          -- creator: signature cuisine
  country text,            -- creator: region
  currency text NOT NULL DEFAULT 'USD ($)',
  onboarded boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Profiles viewable by authenticated" ON public.profiles;
CREATE POLICY "Profiles viewable by authenticated" ON public.profiles
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- 4. Signup trigger: assigns creator/user role + creator metadata ----------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _role public.app_role;
BEGIN
  _role := COALESCE((NEW.raw_user_meta_data->>'role')::public.app_role, 'user');

  INSERT INTO public.profiles (user_id, display_name, role, specialty, country, bio)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email),
    _role::text,
    NULLIF(NEW.raw_user_meta_data->>'specialty', ''),
    NULLIF(NEW.raw_user_meta_data->>'country', ''),
    NULLIF(NEW.raw_user_meta_data->>'bio', '')
  )
  ON CONFLICT (user_id) DO UPDATE SET role = EXCLUDED.role;

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, _role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ---------- 5. Recipes (feed posts vs reels) ----------
CREATE TABLE IF NOT EXISTS public.recipes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,               -- caption shown under the post
  video_url text,
  thumbnail_url text,
  cost_estimate text,
  cook_time text,
  ingredients text[] DEFAULT '{}',
  steps text[] DEFAULT '{}',
  tags text[] DEFAULT '{}',
  view_count int NOT NULL DEFAULT 0,
  like_count int NOT NULL DEFAULT 0,
  save_count int NOT NULL DEFAULT 0,
  comment_count int NOT NULL DEFAULT 0,
  is_reel boolean NOT NULL DEFAULT false,
  post_type text NOT NULL DEFAULT 'post',   -- 'post' | 'reel'
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.recipes TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recipes TO authenticated;
GRANT ALL ON public.recipes TO service_role;
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Recipes are viewable by everyone" ON public.recipes;
CREATE POLICY "Recipes are viewable by everyone" ON public.recipes FOR SELECT USING (true);
-- Only creators can publish:
DROP POLICY IF EXISTS "Creators can insert their own recipes" ON public.recipes;
CREATE POLICY "Creators can insert their own recipes" ON public.recipes
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = creator_id AND public.has_role(auth.uid(), 'creator'));
DROP POLICY IF EXISTS "Creators can update their own recipes" ON public.recipes;
CREATE POLICY "Creators can update their own recipes" ON public.recipes
  FOR UPDATE TO authenticated USING (auth.uid() = creator_id);
DROP POLICY IF EXISTS "Creators can delete their own recipes" ON public.recipes;
CREATE POLICY "Creators can delete their own recipes" ON public.recipes
  FOR DELETE TO authenticated USING (auth.uid() = creator_id);

DROP TRIGGER IF EXISTS update_recipes_updated_at ON public.recipes;
CREATE TRIGGER update_recipes_updated_at BEFORE UPDATE ON public.recipes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- 6. Social: likes / saves / follows / comments ----------
CREATE TABLE IF NOT EXISTS public.likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  recipe_id uuid NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, recipe_id)
);
CREATE TABLE IF NOT EXISTS public.saves (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  recipe_id uuid NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, recipe_id)
);
CREATE TABLE IF NOT EXISTS public.follows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id uuid NOT NULL,
  following_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (follower_id, following_id)
);
CREATE TABLE IF NOT EXISTS public.comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id uuid NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, DELETE ON public.likes, public.saves, public.follows TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.comments TO authenticated;
GRANT SELECT ON public.comments TO anon;
GRANT ALL ON public.likes, public.saves, public.follows, public.comments TO service_role;

ALTER TABLE public.likes    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saves    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follows  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own likes" ON public.likes;
CREATE POLICY "Users can view own likes" ON public.likes FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can like" ON public.likes;
CREATE POLICY "Users can like" ON public.likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can unlike" ON public.likes;
CREATE POLICY "Users can unlike" ON public.likes FOR DELETE TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own saves" ON public.saves;
CREATE POLICY "Users can view own saves" ON public.saves FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can save" ON public.saves;
CREATE POLICY "Users can save" ON public.saves FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can unsave" ON public.saves;
CREATE POLICY "Users can unsave" ON public.saves FOR DELETE TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Participants can view follows" ON public.follows;
CREATE POLICY "Participants can view follows" ON public.follows FOR SELECT TO authenticated
  USING (auth.uid() = follower_id OR auth.uid() = following_id);
DROP POLICY IF EXISTS "Users can follow" ON public.follows;
CREATE POLICY "Users can follow" ON public.follows FOR INSERT TO authenticated WITH CHECK (auth.uid() = follower_id);
DROP POLICY IF EXISTS "Users can unfollow" ON public.follows;
CREATE POLICY "Users can unfollow" ON public.follows FOR DELETE TO authenticated USING (auth.uid() = follower_id);

DROP POLICY IF EXISTS "Comments viewable by everyone" ON public.comments;
CREATE POLICY "Comments viewable by everyone" ON public.comments FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users can comment" ON public.comments;
CREATE POLICY "Users can comment" ON public.comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can edit own comment" ON public.comments;
CREATE POLICY "Users can edit own comment" ON public.comments FOR UPDATE TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own comment" ON public.comments;
CREATE POLICY "Users can delete own comment" ON public.comments FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- counters
CREATE OR REPLACE FUNCTION public.bump_like_count() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN UPDATE public.recipes SET like_count = like_count + 1 WHERE id = NEW.recipe_id; RETURN NEW;
  ELSE UPDATE public.recipes SET like_count = GREATEST(like_count - 1, 0) WHERE id = OLD.recipe_id; RETURN OLD; END IF;
END $$;
CREATE OR REPLACE FUNCTION public.bump_save_count() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN UPDATE public.recipes SET save_count = save_count + 1 WHERE id = NEW.recipe_id; RETURN NEW;
  ELSE UPDATE public.recipes SET save_count = GREATEST(save_count - 1, 0) WHERE id = OLD.recipe_id; RETURN OLD; END IF;
END $$;
CREATE OR REPLACE FUNCTION public.bump_comment_count() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN UPDATE public.recipes SET comment_count = comment_count + 1 WHERE id = NEW.recipe_id; RETURN NEW;
  ELSE UPDATE public.recipes SET comment_count = GREATEST(comment_count - 1, 0) WHERE id = OLD.recipe_id; RETURN OLD; END IF;
END $$;

DROP TRIGGER IF EXISTS trg_like_count ON public.likes;
CREATE TRIGGER trg_like_count AFTER INSERT OR DELETE ON public.likes FOR EACH ROW EXECUTE FUNCTION public.bump_like_count();
DROP TRIGGER IF EXISTS trg_save_count ON public.saves;
CREATE TRIGGER trg_save_count AFTER INSERT OR DELETE ON public.saves FOR EACH ROW EXECUTE FUNCTION public.bump_save_count();
DROP TRIGGER IF EXISTS trg_comment_count ON public.comments;
CREATE TRIGGER trg_comment_count AFTER INSERT OR DELETE ON public.comments FOR EACH ROW EXECUTE FUNCTION public.bump_comment_count();
DROP TRIGGER IF EXISTS set_comments_updated_at ON public.comments;
CREATE TRIGGER set_comments_updated_at BEFORE UPDATE ON public.comments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- 7. Messaging ----------
CREATE TABLE IF NOT EXISTS public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL,
  recipient_id uuid NOT NULL,
  content text NOT NULL,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Conversation participants can view" ON public.messages;
CREATE POLICY "Conversation participants can view" ON public.messages FOR SELECT TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = recipient_id);
DROP POLICY IF EXISTS "Sender can send" ON public.messages;
CREATE POLICY "Sender can send" ON public.messages FOR INSERT TO authenticated WITH CHECK (auth.uid() = sender_id);
DROP POLICY IF EXISTS "Recipient can mark read" ON public.messages;
CREATE POLICY "Recipient can mark read" ON public.messages FOR UPDATE TO authenticated USING (auth.uid() = recipient_id);
DROP POLICY IF EXISTS "Sender can delete own" ON public.messages;
CREATE POLICY "Sender can delete own" ON public.messages FOR DELETE TO authenticated USING (auth.uid() = sender_id);

-- ---------- 8. Stories (24h) ----------
CREATE TABLE IF NOT EXISTS public.stories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  media_url text NOT NULL,
  media_type text NOT NULL DEFAULT 'image',
  caption text,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours')
);
GRANT SELECT ON public.stories TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stories TO authenticated;
GRANT ALL ON public.stories TO service_role;
ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Active stories viewable by everyone" ON public.stories;
CREATE POLICY "Active stories viewable by everyone" ON public.stories FOR SELECT USING (expires_at > now());
DROP POLICY IF EXISTS "Users can create own stories" ON public.stories;
CREATE POLICY "Users can create own stories" ON public.stories FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own stories" ON public.stories;
CREATE POLICY "Users can update own stories" ON public.stories FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own stories" ON public.stories;
CREATE POLICY "Users can delete own stories" ON public.stories FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ---------- 9. Featured creators (discovery) ----------
CREATE TABLE IF NOT EXISTS public.featured_creators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  display_name text NOT NULL,
  username text NOT NULL,
  avatar_url text,
  bio text,
  country text,
  verified boolean NOT NULL DEFAULT false,
  is_premium boolean NOT NULL DEFAULT false,
  followers_seed int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.featured_creators TO anon, authenticated;
GRANT ALL ON public.featured_creators TO service_role;
ALTER TABLE public.featured_creators ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Featured creators viewable by everyone" ON public.featured_creators;
CREATE POLICY "Featured creators viewable by everyone" ON public.featured_creators FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins manage featured creators" ON public.featured_creators;
CREATE POLICY "Admins manage featured creators" ON public.featured_creators FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ---------- 10. Realtime ----------
ALTER TABLE public.likes    REPLICA IDENTITY FULL;
ALTER TABLE public.saves    REPLICA IDENTITY FULL;
ALTER TABLE public.follows  REPLICA IDENTITY FULL;
ALTER TABLE public.comments REPLICA IDENTITY FULL;
ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER TABLE public.stories  REPLICA IDENTITY FULL;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.likes, public.saves, public.follows,
    public.comments, public.messages, public.stories;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------- 11. Storage buckets ----------
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true)
  ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('videos', 'videos', true)
  ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public read media" ON storage.objects;
CREATE POLICY "Public read media" ON storage.objects FOR SELECT
  USING (bucket_id IN ('avatars', 'videos'));
DROP POLICY IF EXISTS "Users upload own media" ON storage.objects;
CREATE POLICY "Users upload own media" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id IN ('avatars','videos') AND auth.uid()::text = (storage.foldername(name))[1]);
DROP POLICY IF EXISTS "Users update own media" ON storage.objects;
CREATE POLICY "Users update own media" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id IN ('avatars','videos') AND auth.uid()::text = (storage.foldername(name))[1]);
DROP POLICY IF EXISTS "Users delete own media" ON storage.objects;
CREATE POLICY "Users delete own media" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id IN ('avatars','videos') AND auth.uid()::text = (storage.foldername(name))[1]);

-- ---------- 12. Promote an existing account to creator (optional) ----------
-- INSERT INTO public.user_roles (user_id, role)
-- SELECT id, 'creator' FROM auth.users WHERE email = 'you@example.com'
-- ON CONFLICT DO NOTHING;
-- UPDATE public.profiles SET role = 'creator'
-- WHERE user_id = (SELECT id FROM auth.users WHERE email = 'you@example.com');
