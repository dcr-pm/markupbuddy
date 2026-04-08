export interface Brand {
  id: string;
  user_id: string;
  name: string;
  is_default: boolean;
  parent_brand_id: string | null;
  company_name: string | null;
  logo_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  accent_color: string | null;
  font_family: string | null;
  header_html: string | null;
  footer_html: string | null;
  tone: BrandTone | null;
  scripting_engine: ScriptingEngine;
  custom_settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export type BrandTone =
  | "formal"
  | "casual"
  | "playful"
  | "professional"
  | "friendly";

export type ScriptingEngine =
  | "none"
  | "ampscript"
  | "liquid"
  | "handlebars"
  | "jinja"
  | "merge_tags"
  | "vtl";

export interface BrandCustomSettings {
  tagline?: string;
  brand_story?: string;
  guidelines_url?: string;
  social_links?: {
    facebook?: string;
    twitter?: string;
    instagram?: string;
    linkedin?: string;
    youtube?: string;
    tiktok?: string;
  };
  extra_colors?: { name: string; hex: string }[];
  heading_font?: string;
  [key: string]: unknown;
}

export interface BrandFormData {
  name: string;
  company_name: string;
  logo_url: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  font_family: string;
  header_html: string;
  footer_html: string;
  tone: BrandTone;
  scripting_engine: ScriptingEngine;
  parent_brand_id: string | null;
  custom_settings: BrandCustomSettings;
}
