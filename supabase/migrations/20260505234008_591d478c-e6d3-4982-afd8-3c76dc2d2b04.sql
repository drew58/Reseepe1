-- Enable realtime for follows and saves so profile/subscriptions update live
ALTER TABLE public.follows REPLICA IDENTITY FULL;
ALTER TABLE public.saves REPLICA IDENTITY FULL;
ALTER TABLE public.likes REPLICA IDENTITY FULL;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.follows;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.saves;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.likes;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;