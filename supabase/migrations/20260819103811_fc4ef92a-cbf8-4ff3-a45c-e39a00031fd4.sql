ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS specialty text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS country text;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _role public.app_role;
BEGIN
  _role := COALESCE((NEW.raw_user_meta_data->>'role')::public.app_role, 'user'::public.app_role);

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

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, _role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$function$;

INSERT INTO public.user_roles (user_id, role)
SELECT u.id, COALESCE((u.raw_user_meta_data->>'role')::public.app_role, 'user'::public.app_role)
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = u.id)
ON CONFLICT (user_id, role) DO NOTHING;

UPDATE public.profiles p
SET role = r.role::text
FROM public.user_roles r
WHERE r.user_id = p.user_id
  AND r.role IN ('creator'::public.app_role, 'admin'::public.app_role)
  AND p.role IS DISTINCT FROM r.role::text;