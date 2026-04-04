"use client";

import { useState } from "react";
import type { Brand, BrandFormData, BrandTone, ScriptingEngine } from "@/types/brand";
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

export function BrandForm({
  brand,
  parentBrands,
  onSubmit,
  onCancel,
  loading,
}: BrandFormProps) {
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
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(form);
  };

  const update = (key: keyof BrandFormData, value: string | null) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {parentBrands && parentBrands.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Parent Brand (optional — makes this a sub-brand)
          </label>
          <select
            value={form.parent_brand_id || ""}
            onChange={(e) => update("parent_brand_id", e.target.value || null)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          >
            <option value="">None (standalone brand)</option>
            {parentBrands.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Brand Name *
          </label>
          <input
            type="text"
            required
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            placeholder="My Brand"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Company Name
          </label>
          <input
            type="text"
            value={form.company_name}
            onChange={(e) => update("company_name", e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            placeholder="Acme Inc."
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-1">
          Logo URL
        </label>
        <input
          type="url"
          value={form.logo_url}
          onChange={(e) => update("logo_url", e.target.value)}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          placeholder="https://example.com/logo.png"
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Primary Color
          </label>
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
          <label className="block text-sm font-medium text-foreground mb-1">
            Secondary Color
          </label>
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
          <label className="block text-sm font-medium text-foreground mb-1">
            Accent Color
          </label>
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

      <div>
        <label className="block text-sm font-medium text-foreground mb-1">
          Font Family
        </label>
        <input
          type="text"
          value={form.font_family}
          onChange={(e) => update("font_family", e.target.value)}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-mono"
          placeholder="Arial, Helvetica, sans-serif"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Tone of Voice
          </label>
          <select
            value={form.tone}
            onChange={(e) => update("tone", e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          >
            {TONES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Scripting Engine (ESP)
          </label>
          <select
            value={form.scripting_engine}
            onChange={(e) => update("scripting_engine", e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
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

      <div>
        <label className="block text-sm font-medium text-foreground mb-1">
          Header HTML (inserted at top of every email)
        </label>
        <textarea
          value={form.header_html}
          onChange={(e) => update("header_html", e.target.value)}
          rows={4}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-mono"
          placeholder="<table>...</table>"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-1">
          Footer HTML (inserted at bottom of every email)
        </label>
        <textarea
          value={form.footer_html}
          onChange={(e) => update("footer_html", e.target.value)}
          rows={4}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-mono"
          placeholder="<table>...</table>"
        />
      </div>

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
