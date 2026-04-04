"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Palette } from "lucide-react";
import type { Brand } from "@/types/brand";
import { cn } from "@/lib/utils";

interface BrandPickerProps {
  brands: Brand[];
  activeBrand: Brand | null;
  onSelect: (brand: Brand | null) => void;
}

export function BrandPicker({
  brands,
  activeBrand,
  onSelect,
}: BrandPickerProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  if (brands.length === 0) return null;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm border border-border hover:bg-muted transition"
      >
        {activeBrand?.primary_color && (
          <div
            className="w-3 h-3 rounded-full border border-border"
            style={{ backgroundColor: activeBrand.primary_color }}
          />
        )}
        {!activeBrand && <Palette className="w-3.5 h-3.5 text-muted-foreground" />}
        <span className="text-muted-foreground">
          {activeBrand?.name || "No brand"}
        </span>
        <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-56 rounded-xl border border-border bg-background shadow-lg z-50 py-1">
          <button
            onClick={() => {
              onSelect(null);
              setOpen(false);
            }}
            className={cn(
              "w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition text-left",
              !activeBrand && "bg-muted"
            )}
          >
            <div className="w-3 h-3 rounded-full border border-dashed border-muted-foreground" />
            No brand
          </button>
          {brands.map((brand) => (
            <button
              key={brand.id}
              onClick={() => {
                onSelect(brand);
                setOpen(false);
              }}
              className={cn(
                "w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition text-left",
                activeBrand?.id === brand.id && "bg-muted"
              )}
            >
              <div
                className="w-3 h-3 rounded-full border border-border"
                style={{ backgroundColor: brand.primary_color || "#ccc" }}
              />
              <span>{brand.name}</span>
              {brand.parent_brand_id && (
                <span className="text-xs text-muted-foreground">(sub)</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
