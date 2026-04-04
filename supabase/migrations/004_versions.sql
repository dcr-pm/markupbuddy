-- Version history
CREATE TABLE public.versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  html_content TEXT NOT NULL,
  change_summary TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own versions" ON public.versions FOR SELECT
  USING (conversation_id IN (SELECT id FROM public.conversations WHERE user_id = auth.uid()));

CREATE POLICY "Users insert own versions" ON public.versions FOR INSERT
  WITH CHECK (conversation_id IN (SELECT id FROM public.conversations WHERE user_id = auth.uid()));

CREATE INDEX idx_versions_conversation ON public.versions(conversation_id, version_number);
