"use client";

import { useState, useCallback, useEffect } from "react";
import type { Brand, BrandFormData } from "@/types/brand";
import type { BrandContext } from "@/types/chat";

export function useBrands() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [activeBrand, setActiveBrand] = useState<Brand | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchBrands = useCallback(async () => {
    try {
      const res = await fetch("/api/brands");
      if (res.ok) {
        const data = await res.json();
        setBrands(data.brands || []);
        // Set default brand as active
        const defaultBrand = (data.brands || []).find(
          (b: Brand) => b.is_default
        );
        if (defaultBrand && !activeBrand) {
          setActiveBrand(defaultBrand);
        }
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [activeBrand]);

  useEffect(() => {
    fetchBrands();
  }, [fetchBrands]);

  const createBrand = useCallback(
    async (data: BrandFormData): Promise<Brand | null> => {
      try {
        const res = await fetch("/api/brands", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        if (res.ok) {
          const brand = await res.json();
          await fetchBrands();
          return brand;
        }
      } catch {
        // silently fail
      }
      return null;
    },
    [fetchBrands]
  );

  const updateBrand = useCallback(
    async (id: string, data: Partial<BrandFormData>): Promise<boolean> => {
      try {
        const res = await fetch("/api/brands", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, ...data }),
        });
        if (res.ok) {
          await fetchBrands();
          return true;
        }
      } catch {
        // silently fail
      }
      return false;
    },
    [fetchBrands]
  );

  const deleteBrand = useCallback(
    async (id: string) => {
      try {
        await fetch(`/api/brands?id=${id}`, { method: "DELETE" });
        if (activeBrand?.id === id) setActiveBrand(null);
        await fetchBrands();
      } catch {
        // silently fail
      }
    },
    [fetchBrands, activeBrand]
  );

  const getBrandContext = useCallback((): BrandContext | null => {
    if (!activeBrand) return null;

    // If sub-brand, merge with parent
    let brand = activeBrand;
    if (brand.parent_brand_id) {
      const parent = brands.find((b) => b.id === brand.parent_brand_id);
      if (parent) {
        brand = {
          ...parent,
          ...Object.fromEntries(
            Object.entries(brand).filter(
              ([, v]) => v !== null && v !== undefined && v !== ""
            )
          ),
        } as Brand;
      }
    }

    const cs = (brand.custom_settings || {}) as Record<string, unknown>;
    const socialLinks = (cs.social_links || {}) as Record<string, string>;
    // Filter out empty social links
    const filteredSocial = Object.fromEntries(
      Object.entries(socialLinks).filter(([, v]) => v)
    );

    return {
      company_name: brand.company_name,
      logo_url: brand.logo_url,
      primary_color: brand.primary_color,
      secondary_color: brand.secondary_color,
      accent_color: brand.accent_color,
      font_family: brand.font_family,
      header_html: brand.header_html,
      footer_html: brand.footer_html,
      tone: brand.tone,
      scripting_engine: brand.scripting_engine,
      tagline: (cs.tagline as string) || undefined,
      brand_story: (cs.brand_story as string) || undefined,
      heading_font: (cs.heading_font as string) || undefined,
      guidelines_url: (cs.guidelines_url as string) || undefined,
      social_links: Object.keys(filteredSocial).length > 0 ? filteredSocial : undefined,
      extra_colors: (cs.extra_colors as { name: string; hex: string }[])?.length
        ? (cs.extra_colors as { name: string; hex: string }[])
        : undefined,
    };
  }, [activeBrand, brands]);

  return {
    brands,
    activeBrand,
    loading,
    setActiveBrand,
    createBrand,
    updateBrand,
    deleteBrand,
    getBrandContext,
    refetch: fetchBrands,
  };
}
