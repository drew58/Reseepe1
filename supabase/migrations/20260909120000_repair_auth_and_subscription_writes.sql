-- Keep auth-trigger and manual subscription contracts valid on existing projects.
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

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'user';
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  selected_role public.app_role;
  selected_username text;
BEGIN
  selected_role := CASE
    WHEN NEW.raw_user_meta_data->>'role' IN ('creator', 'admin')
      THEN (NEW.raw_user_meta_data->>'role')::public.app_role
    ELSE 'user'::public.app_role
  END;
  selected_username := NULLIF(lower(trim(NEW.raw_user_meta_data->>'username')), '');

  INSERT INTO public.profiles (user_id, display_name, username, role)
  VALUES (
    NEW.id,
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'display_name', ''), NEW.email),
    selected_username,
    selected_role::text
  )
  ON CONFLICT (user_id) DO UPDATE SET
    display_name = COALESCE(EXCLUDED.display_name, public.profiles.display_name),
    username = COALESCE(EXCLUDED.username, public.profiles.username),
    role = EXCLUDED.role;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, selected_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TABLE IF NOT EXISTS public.billing_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  provider text NOT NULL,
  provider_customer_id text,
  provider_subscription_id text UNIQUE,
  tier text NOT NULL CHECK (tier IN ('free', 'premium', 'pro')),
  status text NOT NULL CHECK (status IN ('active', 'trialing', 'past_due', 'canceled', 'expired')),
  current_period_ends_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.billing_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own billing subscription" ON public.billing_subscriptions;
CREATE POLICY "Users can view own billing subscription"
  ON public.billing_subscriptions FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own manual subscription" ON public.billing_subscriptions;
CREATE POLICY "Users can create own manual subscription"
  ON public.billing_subscriptions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND provider = 'manual');

DROP POLICY IF EXISTS "Users can update own manual subscription" ON public.billing_subscriptions;
CREATE POLICY "Users can update own manual subscription"
  ON public.billing_subscriptions FOR UPDATE TO authenticated
  USING (auth.uid() = user_id AND provider = 'manual')
  WITH CHECK (auth.uid() = user_id AND provider = 'manual');

DROP POLICY IF EXISTS "Users can cancel own manual subscription" ON public.billing_subscriptions;
CREATE POLICY "Users can cancel own manual subscription"
  ON public.billing_subscriptions FOR DELETE TO authenticated
  USING (auth.uid() = user_id AND provider = 'manual');