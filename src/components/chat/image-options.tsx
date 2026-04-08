"use client";

import { useState } from "react";
import { Loader2, Check, ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface ImageOptionsProps {
  prompt: string;
  onSelect: (url: string) => void;
}

export function ImageOptions({ prompt, onSelect }: ImageOptionsProps) {
  const [images, setImages] = useState<{ url: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [generated, setGenerated] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, n: 3 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setImages(data.images);
      setGenerated(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate images");
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (url: string) => {
    setSelected(url);
    onSelect(url);
  };

  if (!generated) {
    return (
      <div className="my-2 p-3 rounded-xl border border-border bg-muted/50">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
          <ImageIcon className="w-4 h-4" />
          <span className="font-medium">Image suggestion:</span>
          <span className="italic">{prompt}</span>
        </div>
        <button
          onClick={handleGenerate}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <ImageIcon className="w-3.5 h-3.5" />
              Generate options
            </>
          )}
        </button>
        {error && (
          <p className="text-xs text-destructive mt-2">{error}</p>
        )}
      </div>
    );
  }

  return (
    <div className="my-2 p-3 rounded-xl border border-border bg-muted/50">
      <p className="text-xs text-muted-foreground mb-2 font-medium">
        Pick an image:
      </p>
      <div className="grid grid-cols-3 gap-2">
        {images.map((img, i) => (
          <button
            key={img.url || i}
            onClick={() => handleSelect(img.url)}
            className={cn(
              "relative rounded-lg overflow-hidden border-2 transition",
              selected === img.url
                ? "border-primary ring-2 ring-primary/30"
                : "border-transparent hover:border-primary/40"
            )}
          >
            <img
              src={img.url}
              alt={`Option ${i + 1}`}
              className="w-full aspect-[4/3] object-cover"
            />
            {selected === img.url && (
              <div className="absolute top-1 right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                <Check className="w-3 h-3 text-white" />
              </div>
            )}
          </button>
        ))}
      </div>
      {selected && (
        <p className="text-xs text-green-500 mt-2">
          Image selected — ask me to update the email with it.
        </p>
      )}
    </div>
  );
}
