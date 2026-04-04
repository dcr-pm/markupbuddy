-- Brand profiles
CREATE TABLE public.brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_default BOOLEAN DEFAULT FALSE,
  parent_brand_id UUID REFERENCES public.brands(id) ON DELETE SET NULL,
  company_name TEXT,
  logo_url TEXT,
  primary_color TEXT,
  secondary_color TEXT,
  accent_color TEXT,
  font_family TEXT,
  header_html TEXT,
  footer_html TEXT,
  tone TEXT CHECK (tone IN ('formal','casual','playful','professional','friendly')),
  scripting_engine TEXT DEFAULT 'none' CHECK (scripting_engine IN ('none','ampscript','liquid','handlebars','jinja','merge_tags','vtl')),
  custom_settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users CRUD own brands" ON public.brands FOR ALL USING (auth.uid() = user_id);

-- Foreign keys to brands
ALTER TABLE public.profiles ADD CONSTRAINT fk_default_brand
  FOREIGN KEY (default_brand_id) REFERENCES public.brands(id) ON DELETE SET NULL;
ALTER TABLE public.conversations ADD CONSTRAINT fk_active_brand
  FOREIGN KEY (active_brand_id) REFERENCES public.brands(id) ON DELETE SET NULL;

-- Index
CREATE INDEX idx_brands_user ON public.brands(user_id);
