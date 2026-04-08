"use client";

import { useState, useRef } from "react";
import type { Brand, BrandFormData, BrandTone, BrandCustomSettings } from "@/types/brand";
import { SCRIPTING_ENGINES } from "@/types/scripting";

interface BrandFormProps {
  brand?: Brand | null;
  parentBrands?: Brand[];
  onSubmit: (data: BrandFormData) => void;
  onCancel: () => void;
  loading?: boolean;
}

const TONES: { value: BrandTone; label: string }[] = [
  { value: "formal", label: "Formal" },
  { value: "casual", label: "Casual" },
  { value: "playful", label: "Playful" },
  { value: "professional", label: "Professional" },
  { value: "friendly", label: "Friendly" },
];

const SOCIAL_PLATFORMS = [
  { key: "facebook", label: "Facebook", placeholder: "https://facebook.com/yourcompany" },
  { key: "twitter", label: "X (Twitter)", placeholder: "https://x.com/yourcompany" },
  { key: "instagram", label: "Instagram", placeholder: "https://instagram.com/yourcompany" },
  { key: "linkedin", label: "LinkedIn", placeholder: "https://linkedin.com/company/yourcompany" },
  { key: "youtube", label: "YouTube", placeholder: "https://youtube.com/@yourcompany" },
  { key: "tiktok", label: "TikTok", placeholder: "https://tiktok.com/@yourcompany" },
] as const;

export function BrandForm({
  brand,
  parentBrands,
  onSubmit,
  onCancel,
  loading,
}: BrandFormProps) {
  const existingSettings = (brand?.custom_settings || {}) as BrandCustomSettings;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const [form, setForm] = useState<BrandFormData>({
    name: brand?.name || "",
    company_name: brand?.company_name || "",
    logo_url: brand?.logo_url || "",
    primary_color: brand?.primary_color || "#2563eb",
    secondary_color: brand?.secondary_color || "#1e40af",
    accent_color: brand?.accent_color || "#f59e0b",
    font_family: brand?.font_family || "Arial, Helvetica, sans-serif",
    header_html: brand?.header_html || "",
    footer_html: brand?.footer_html || "",
    tone: brand?.tone || "professional",
    scripting_engine: brand?.scripting_engine || "none",
    parent_brand_id: brand?.parent_brand_id || null,
    custom_settings: {
      tagline: existingSettings.tagline || "",
      brand_story: existingSettings.brand_story || "",
      guidelines_url: existingSettings.guidelines_url || "",
      heading_font: existingSettings.heading_font || "",
      social_links: {
        facebook: existingSettings.social_links?.facebook || "",
        twitter: existingSettings.social_links?.twitter || "",
        instagram: existingSettings.social_links?.instagram || "",
        linkedin: existingSettings.social_links?.linkedin || "",
        youtube: existingSettings.social_links?.youtube || "",
        tiktok: existingSettings.social_links?.tiktok || "",
      },
      extra_colors: existingSettings.extra_colors || [],
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(form);
  };

  const update = (key: keyof BrandFormData, value: string | null) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const updateCustom = (key: keyof BrandCustomSettings, value: unknown) => {
    setForm((prev) => ({
      ...prev,
      custom_settings: { ...prev.custom_settings, [key]: value },
    }));
  };

  const updateSocial = (platform: string, url: string) => {
    setForm((prev) => ({
      ...prev,
      custom_settings: {
        ...prev.custom_settings,
        social_links: { ...prev.custom_settings.social_links, [platform]: url },
      },
    }));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (data.url) {
        updateCustom("guidelines_url", data.url);
      } else {
        alert(data.error || "Upload failed");
      }
    } catch {
      alert("Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const addExtraColor = () => {
    const current = form.custom_settings.extra_colors || [];
    updateCustom("extra_colors", [...current, { name: "", hex: "#666666" }]);
  };

  const updateExtraColor = (index: number, field: "name" | "hex", value: string) => {
    const current = [...(form.custom_settings.extra_colors || [])];
    current[index] = { ...current[index], [field]: value };
    updateCustom("extra_colors", current);
  };

  const removeExtraColor = (index: number) => {
    const current = [...(form.custom_settings.extra_colors || [])];
    current.splice(index, 1);
    updateCustom("extra_colors", current);
  };

  const inputClass = "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm";
  const labelClass = "block text-sm font-medium text-foreground mb-1";
  const sectionClass = "space-y-4";
  const sectionHeadingClass = "text-sm font-semibold text-foreground/80 uppercase tracking-wider border-b border-border pb-2";

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* ---- Parent Brand ---- */}
      {parentBrands && parentBrands.length > 0 && (
        <div>
          <label className={labelClass}>
            Parent Brand (optional — makes this a sub-brand)
          </label>
          <select
            value={form.parent_brand_id || ""}
            onChange={(e) => update("parent_brand_id", e.target.value || null)}
            className={inputClass}
          >
            <option value="">None (standalone brand)</option>
            {parentBrands.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* ---- Brand Identity ---- */}
      <div className={sectionClass}>
        <h3 className={sectionHeadingClass}>Brand Identity</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Brand Name *</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              className={inputClass}
              placeholder="My Brand"
            />
          </div>
          <div>
            <label className={labelClass}>Company Name</label>
            <input
              type="text"
              value={form.company_name}
              onChange={(e) => update("company_name", e.target.value)}
              className={inputClass}
              placeholder="Acme Inc."
            />
          </div>
        </div>

        <div>
          <label className={labelClass}>Tagline / Slogan</label>
          <input
            type="text"
            value={form.custom_settings.tagline || ""}
            onChange={(e) => updateCustom("tagline", e.target.value)}
            className={inputClass}
            placeholder="Simple and powerful — the ultimate productivity tool"
          />
        </div>

        <div>
          <label className={labelClass}>Brand Story</label>
          <textarea
            value={form.custom_settings.brand_story || ""}
            onChange={(e) => updateCustom("brand_story", e.target.value)}
            rows={3}
            className={inputClass}
            placeholder="Tell us about your brand — mission, vision, key values, and personality..."
          />
        </div>

        <div>
          <label className={labelClass}>Logo URL</label>
          <input
            type="url"
            value={form.logo_url}
            onChange={(e) => update("logo_url", e.target.value)}
            className={inputClass}
            placeholder="https://example.com/logo.png"
          />
        </div>
      </div>

      {/* ---- Brand Guidelines Upload ---- */}
      <div className={sectionClass}>
        <h3 className={sectionHeadingClass}>Brand Guidelines Document</h3>
        <p className="text-xs text-muted-foreground">
          Upload your brand guidelines as a PDF or Word doc. This will be referenced when generating emails.
        </p>
        <div className="flex items-center gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.doc,.docx"
            onChange={handleFileUpload}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="px-4 py-2 rounded-lg border border-border text-sm hover:bg-muted transition disabled:opacity-50"
          >
            {uploading ? "Uploading..." : "Upload PDF / DOC"}
          </button>
          {form.custom_settings.guidelines_url && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <a
                href={form.custom_settings.guidelines_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline truncate max-w-[200px]"
              >
                View uploaded file
              </a>
              <button
                type="button"
                onClick={() => updateCustom("guidelines_url", "")}
                className="text-xs text-red-400 hover:text-red-300"
              >
                Remove
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ---- Colors ---- */}
      <div className={sectionClass}>
        <h3 className={sectionHeadingClass}>Color Palette</h3>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className={labelClass}>Primary Color</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={form.primary_color}
                onChange={(e) => update("primary_color", e.target.value)}
                className="w-8 h-8 rounded cursor-pointer"
              />
              <input
                type="text"
                value={form.primary_color}
                onChange={(e) => update("primary_color", e.target.value)}
                className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm font-mono"
              />
            </div>
          </div>
          <div>
            <label className={labelClass}>Secondary Color</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={form.secondary_color}
                onChange={(e) => update("secondary_color", e.target.value)}
                className="w-8 h-8 rounded cursor-pointer"
              />
              <input
                type="text"
                value={form.secondary_color}
                onChange={(e) => update("secondary_color", e.target.value)}
                className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm font-mono"
              />
            </div>
          </div>
          <div>
            <label className={labelClass}>Accent Color</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={form.accent_color}
                onChange={(e) => update("accent_color", e.target.value)}
                className="w-8 h-8 rounded cursor-pointer"
              />
              <input
                type="text"
                value={form.accent_color}
                onChange={(e) => update("accent_color", e.target.value)}
                className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm font-mono"
              />
            </div>
          </div>
        </div>

        {/* Extra colors */}
        {(form.custom_settings.extra_colors || []).map((color, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              type="color"
              value={color.hex}
              onChange={(e) => updateExtraColor(i, "hex", e.target.value)}
              className="w-8 h-8 rounded cursor-pointer"
            />
            <input
              type="text"
              value={color.hex}
              onChange={(e) => updateExtraColor(i, "hex", e.target.value)}
              className="w-28 rounded-lg border border-border bg-background px-3 py-2 text-sm font-mono"
            />
            <input
              type="text"
              value={color.name}
              onChange={(e) => updateExtraColor(i, "name", e.target.value)}
              className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm"
              placeholder="Color name (e.g. Success Green)"
            />
            <button
              type="button"
              onClick={() => removeExtraColor(i)}
              className="text-xs text-red-400 hover:text-red-300 px-2"
            >
              Remove
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={addExtraColor}
          className="text-sm text-primary hover:underline"
        >
          + Add another color
        </button>
      </div>

      {/* ---- Typography ---- */}
      <div className={sectionClass}>
        <h3 className={sectionHeadingClass}>Typography</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Body Font Family</label>
            <input
              type="text"
              value={form.font_family}
              onChange={(e) => update("font_family", e.target.value)}
              className={inputClass + " font-mono"}
              placeholder="Arial, Helvetica, sans-serif"
            />
          </div>
          <div>
            <label className={labelClass}>Heading Font Family</label>
            <input
              type="text"
              value={form.custom_settings.heading_font || ""}
              onChange={(e) => updateCustom("heading_font", e.target.value)}
              className={inputClass + " font-mono"}
              placeholder="Georgia, serif (leave blank to use body font)"
            />
          </div>
        </div>
      </div>

      {/* ---- Tone & ESP ---- */}
      <div className={sectionClass}>
        <h3 className={sectionHeadingClass}>Voice & Technical</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Tone of Voice</label>
            <select
              value={form.tone}
              onChange={(e) => update("tone", e.target.value)}
              className={inputClass}
            >
              {TONES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Scripting Engine (ESP)</label>
            <select
              value={form.scripting_engine}
              onChange={(e) => update("scripting_engine", e.target.value)}
              className={inputClass}
            >
              <option value="none">None</option>
              {Object.values(SCRIPTING_ENGINES).map((eng) => (
                <option key={eng.id} value={eng.id}>
                  {eng.name} ({eng.description})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ---- Social Links ---- */}
      <div className={sectionClass}>
        <h3 className={sectionHeadingClass}>Social Media Links</h3>
        <p className="text-xs text-muted-foreground">
          These will be used for social icons in email footers.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {SOCIAL_PLATFORMS.map((p) => (
            <div key={p.key}>
              <label className={labelClass}>{p.label}</label>
              <input
                type="url"
                value={form.custom_settings.social_links?.[p.key as keyof typeof form.custom_settings.social_links] || ""}
                onChange={(e) => updateSocial(p.key, e.target.value)}
                className={inputClass}
                placeholder={p.placeholder}
              />
            </div>
          ))}
        </div>
      </div>

      {/* ---- Custom HTML ---- */}
      <div className={sectionClass}>
        <h3 className={sectionHeadingClass}>Custom HTML Templates</h3>
        <div>
          <label className={labelClass}>
            Header HTML (inserted at top of every email)
          </label>
          <textarea
            value={form.header_html}
            onChange={(e) => update("header_html", e.target.value)}
            rows={4}
            className={inputClass + " font-mono"}
            placeholder="<table>...</table>"
          />
        </div>
        <div>
          <label className={labelClass}>
            Footer HTML (inserted at bottom of every email)
          </label>
          <textarea
            value={form.footer_html}
            onChange={(e) => update("footer_html", e.target.value)}
            rows={4}
            className={inputClass + " font-mono"}
            placeholder="<table>...</table>"
          />
        </div>
      </div>

      {/* ---- Actions ---- */}
      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 rounded-lg border border-border text-sm hover:bg-muted transition"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition disabled:opacity-50"
        >
          {loading ? "Saving..." : brand ? "Update Brand" : "Create Brand"}
        </button>
      </div>
    </form>
  );
}
