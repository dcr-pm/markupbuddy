"use client";

import { useBrands } from "@/hooks/use-brand";
import { BrandForm } from "@/components/brand/brand-form";
import { useState } from "react";
import type { Brand, BrandFormData } from "@/types/brand";
import { Plus, Edit2, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function BrandsPage() {
  const { brands, createBrand, updateBrand, deleteBrand } = useBrands();
  const [showForm, setShowForm] = useState(false);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  const [loading, setLoading] = useState(false);

  const parentBrands = brands.filter((b) => !b.parent_brand_id);

  const handleSubmit = async (data: BrandFormData) => {
    setLoading(true);
    if (editingBrand) {
      const success = await updateBrand(editingBrand.id, data);
      if (success) toast.success("Brand updated");
    } else {
      const brand = await createBrand(data);
      if (brand) toast.success("Brand created");
    }
    setLoading(false);
    setShowForm(false);
    setEditingBrand(null);
  };

  const handleDelete = async (brand: Brand) => {
    if (
      !window.confirm(`Delete "${brand.name}"? This cannot be undone.`)
    )
      return;
    await deleteBrand(brand.id);
    toast.success("Brand deleted");
  };

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Brands</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Set up your brand profiles. The AI will auto-apply these to every
              email.
            </p>
          </div>
          {!showForm && (
            <button
              onClick={() => {
                setEditingBrand(null);
                setShowForm(true);
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition"
            >
              <Plus className="w-4 h-4" />
              New Brand
            </button>
          )}
        </div>

        {showForm && (
          <div className="bg-muted rounded-xl p-6 mb-6 border border-border">
            <h2 className="text-lg font-semibold mb-4">
              {editingBrand ? "Edit Brand" : "New Brand"}
            </h2>
            <BrandForm
              brand={editingBrand}
              parentBrands={parentBrands}
              onSubmit={handleSubmit}
              onCancel={() => {
                setShowForm(false);
                setEditingBrand(null);
              }}
              loading={loading}
            />
          </div>
        )}

        {brands.length === 0 && !showForm && (
          <div className="text-center py-12 text-muted-foreground">
            <p>No brands yet. Create one to get started.</p>
          </div>
        )}

        <div className="space-y-3">
          {brands.map((brand) => (
            <div
              key={brand.id}
              className="flex items-center justify-between p-4 rounded-xl border border-border bg-background hover:border-primary/30 transition"
            >
              <div className="flex items-center gap-3">
                <div className="flex gap-1">
                  {brand.primary_color && (
                    <div
                      className="w-6 h-6 rounded-full border border-border"
                      style={{ backgroundColor: brand.primary_color }}
                    />
                  )}
                  {brand.secondary_color && (
                    <div
                      className="w-6 h-6 rounded-full border border-border"
                      style={{ backgroundColor: brand.secondary_color }}
                    />
                  )}
                  {brand.accent_color && (
                    <div
                      className="w-6 h-6 rounded-full border border-border"
                      style={{ backgroundColor: brand.accent_color }}
                    />
                  )}
                </div>
                <div>
                  <h3 className="font-medium text-foreground">
                    {brand.name}
                    {brand.is_default && (
                      <span className="ml-2 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                        Default
                      </span>
                    )}
                    {brand.parent_brand_id && (
                      <span className="ml-2 text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                        Sub-brand
                      </span>
                    )}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {[
                      brand.company_name,
                      brand.tone,
                      brand.scripting_engine !== "none"
                        ? brand.scripting_engine
                        : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    setEditingBrand(brand);
                    setShowForm(true);
                  }}
                  className="p-2 rounded-lg hover:bg-muted transition"
                >
                  <Edit2 className="w-4 h-4 text-muted-foreground" />
                </button>
                <button
                  onClick={() => handleDelete(brand)}
                  className="p-2 rounded-lg hover:bg-destructive/10 hover:text-destructive transition"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
