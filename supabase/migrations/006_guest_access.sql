-- Guest access: visitors are signed in with Supabase anonymous auth
-- (enable "Anonymous sign-ins" in Supabase Auth settings) and get a
-- limited number of email generations.

-- Anonymous users have no email
ALTER TABLE public.profiles ALTER COLUMN email DROP NOT NULL;

-- Per-user generation counter. Users can read their own row; only the
-- SECURITY DEFINER function below can change it.
CREATE TABLE public.generation_usage (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  used INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.generation_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own generation usage" ON public.generation_usage
  FOR SELECT USING (auth.uid() = user_id);

-- Records one generation for the calling user and returns the new total.
CREATE OR REPLACE FUNCTION public.record_generation() RETURNS INTEGER AS $$
DECLARE
  v_used INTEGER;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  INSERT INTO public.generation_usage (user_id, used)
  VALUES (auth.uid(), 1)
  ON CONFLICT (user_id) DO UPDATE
    SET used = public.generation_usage.used + 1, updated_at = NOW()
  RETURNING used INTO v_used;

  RETURN v_used;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.record_generation() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_generation() TO authenticated;
