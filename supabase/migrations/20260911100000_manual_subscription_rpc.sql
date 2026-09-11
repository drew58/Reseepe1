-- Allow the app to manage its own manual subscription without exposing table writes.
CREATE OR REPLACE FUNCTION public.set_manual_subscription(requested_tier text)
RETURNS public.billing_subscriptions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  saved_subscription public.billing_subscriptions;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF requested_tier NOT IN ('free', 'premium') THEN
    RAISE EXCEPTION 'Invalid subscription tier';
  END IF;

  INSERT INTO public.billing_subscriptions (user_id, provider, tier, status, current_period_ends_at)
  VALUES (auth.uid(), 'manual', requested_tier, 'active', NULL)
  ON CONFLICT (user_id) DO UPDATE SET
    provider = 'manual',
    tier = EXCLUDED.tier,
    status = 'active',
    current_period_ends_at = NULL,
    updated_at = now()
  RETURNING * INTO saved_subscription;

  RETURN saved_subscription;
END;
$$;

REVOKE ALL ON FUNCTION public.set_manual_subscription(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_manual_subscription(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.cancel_manual_subscription()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.billing_subscriptions
  WHERE user_id = auth.uid() AND provider = 'manual';
$$;

REVOKE ALL ON FUNCTION public.cancel_manual_subscription() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancel_manual_subscription() TO authenticated;