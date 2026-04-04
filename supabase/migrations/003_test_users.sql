-- Test users for proofing
CREATE TABLE public.test_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  client TEXT,
  tier TEXT,
  custom_fields JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Test data extensions (AI-generated proof data)
CREATE TABLE public.test_data_extensions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Test Data',
  columns TEXT[] NOT NULL DEFAULT '{}',
  rows JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Test send log
CREATE TABLE public.test_sends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  version_id UUID,
  recipients JSONB NOT NULL,
  subject TEXT,
  from_name TEXT,
  reply_to TEXT,
  sent_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.test_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_data_extensions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_sends ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users CRUD own test users" ON public.test_users FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users CRUD own test DEs" ON public.test_data_extensions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users CRUD own test sends" ON public.test_sends FOR ALL USING (auth.uid() = user_id);

CREATE INDEX idx_test_users_user ON public.test_users(user_id);
CREATE INDEX idx_test_des_conversation ON public.test_data_extensions(conversation_id);
