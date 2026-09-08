-- The current UI manages manual subscriptions directly. Keep writes limited to
-- the authenticated user's own billing row until a payment webhook is wired.
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