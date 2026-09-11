-- A profile username collision must not roll back the auth.users insert.
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

  BEGIN
    INSERT INTO public.profiles (user_id, display_name, username, role)
    VALUES (
      NEW.id,
      COALESCE(NULLIF(NEW.raw_user_meta_data->>'display_name', ''), NULLIF(NEW.raw_user_meta_data->>'full_name', ''), NULLIF(NEW.raw_user_meta_data->>'name', ''), NEW.email),
      selected_username,
      selected_role::text
    )
    ON CONFLICT (user_id) DO UPDATE SET
      display_name = COALESCE(EXCLUDED.display_name, public.profiles.display_name),
      username = COALESCE(EXCLUDED.username, public.profiles.username),
      role = EXCLUDED.role;
  EXCEPTION WHEN unique_violation THEN
    INSERT INTO public.profiles (user_id, display_name, role)
    VALUES (
      NEW.id,
      COALESCE(NULLIF(NEW.raw_user_meta_data->>'display_name', ''), NULLIF(NEW.raw_user_meta_data->>'full_name', ''), NULLIF(NEW.raw_user_meta_data->>'name', ''), NEW.email),
      selected_role::text
    )
    ON CONFLICT (user_id) DO NOTHING;
  END;

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