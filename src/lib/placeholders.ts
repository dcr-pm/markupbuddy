/**
 * Placeholder images and standard hrefs for email generation.
 *
 * Uses placehold.co — reliable, fast, and customizable.
 * All URLs are https and produce clean, professional-looking placeholders.
 */

// ---------- Placeholder Images ----------

export interface PlaceholderImage {
  url: string;
  alt: string;
  width: number;
  height: number;
  category: string;
}

const BASE = "https://placehold.co";

/** Light, generic background colors — no text overlay */
const COLORS = {
  neutral: "f1f5f9/f1f5f9",
  blue: "e0ecff/e0ecff",
  green: "e6f5ec/e6f5ec",
  purple: "f0e8ff/f0e8ff",
  orange: "fff3e0/fff3e0",
  pink: "fce4ec/fce4ec",
  dark: "d6dce5/d6dce5",
} as const;

function img(
  w: number,
  h: number,
  alt: string,
  color: keyof typeof COLORS = "neutral",
): PlaceholderImage {
  const c = COLORS[color];
  return {
    url: `${BASE}/${w}x${h}/${c}`,
    alt,
    width: w,
    height: h,
    category: "",
  };
}

export const PLACEHOLDER_IMAGES = {
  // Hero banners
  hero: {
    fullWidth: { ...img(600, 300, "Hero+Banner", "blue"), category: "hero" },
    lifestyle: { ...img(600, 300, "Lifestyle+Image", "green"), category: "hero" },
    product: { ...img(600, 300, "Product+Showcase", "purple"), category: "hero" },
    announcement: { ...img(600, 300, "Announcement", "orange"), category: "hero" },
    seasonal: { ...img(600, 300, "Seasonal+Banner", "pink"), category: "hero" },
  },

  // Product images
  products: {
    square: { ...img(300, 300, "Product", "neutral"), category: "product" },
    portrait: { ...img(300, 400, "Product", "neutral"), category: "product" },
    small: { ...img(200, 200, "Product", "neutral"), category: "product" },
    thumbnail: { ...img(150, 150, "Product", "neutral"), category: "product" },
  },

  // Feature / icon placeholders
  icons: {
    small: { ...img(64, 64, "Icon", "blue"), category: "icon" },
    medium: { ...img(80, 80, "Icon", "blue"), category: "icon" },
    large: { ...img(120, 120, "Icon", "blue"), category: "icon" },
  },

  // People / avatars
  avatars: {
    small: { ...img(80, 80, "Avatar", "purple"), category: "avatar" },
    medium: { ...img(100, 100, "Avatar", "purple"), category: "avatar" },
    large: { ...img(150, 150, "Avatar", "purple"), category: "avatar" },
  },

  // Logos
  logos: {
    wide: { ...img(200, 60, "Logo", "dark"), category: "logo" },
    square: { ...img(100, 100, "Logo", "dark"), category: "logo" },
    small: { ...img(120, 40, "Logo", "dark"), category: "logo" },
  },

  // Content / article images
  content: {
    wide: { ...img(600, 200, "Content+Image", "green"), category: "content" },
    medium: { ...img(400, 250, "Content+Image", "green"), category: "content" },
    half: { ...img(280, 200, "Content+Image", "green"), category: "content" },
  },

  // Social proof
  social: {
    stars: { ...img(120, 24, "★★★★★", "orange"), category: "social-proof" },
    badge: { ...img(150, 50, "Trusted+By+10K+Users", "orange"), category: "social-proof" },
    partnerLogo: { ...img(120, 40, "Partner+Logo", "neutral"), category: "social-proof" },
  },

  // App store badges
  appBadges: {
    appStore: { ...img(135, 40, "App+Store", "dark"), category: "app-badge" },
    googlePlay: { ...img(135, 40, "Google+Play", "dark"), category: "app-badge" },
  },

  // Decorative / spacer
  decorative: {
    divider: { ...img(600, 2, "", "neutral"), category: "decorative" },
    spacer: { ...img(1, 20, "", "neutral"), category: "decorative" },
  },
} as const;

/**
 * Generate a custom placeholder image URL.
 */
export function customPlaceholder(
  width: number,
  height: number,
  _text?: string,
  color: keyof typeof COLORS = "neutral",
): string {
  const c = COLORS[color];
  return `${BASE}/${width}x${height}/${c}`;
}

// ---------- Standard Placeholder HREFs ----------

/**
 * Standard placeholder hrefs for email links.
 * These use # or example.com patterns that are safe and clearly placeholder.
 */
export const PLACEHOLDER_HREFS = {
  // CTAs
  cta: {
    primary: "https://example.com/get-started",
    shopNow: "https://example.com/shop",
    learnMore: "https://example.com/learn-more",
    signUp: "https://example.com/sign-up",
    download: "https://example.com/download",
    bookNow: "https://example.com/book",
    buyNow: "https://example.com/buy",
    viewCollection: "https://example.com/collection",
    readMore: "https://example.com/read-more",
    getOffer: "https://example.com/offer",
  },

  // Required footer links
  footer: {
    unsubscribe: "https://example.com/unsubscribe",
    preferences: "https://example.com/preferences",
    privacy: "https://example.com/privacy-policy",
    terms: "https://example.com/terms",
    viewInBrowser: "https://example.com/view-in-browser",
  },

  // Social media
  social: {
    facebook: "https://facebook.com/yourcompany",
    twitter: "https://twitter.com/yourcompany",
    instagram: "https://instagram.com/yourcompany",
    linkedin: "https://linkedin.com/company/yourcompany",
    youtube: "https://youtube.com/@yourcompany",
    tiktok: "https://tiktok.com/@yourcompany",
  },

  // Product / content links
  content: {
    product: "https://example.com/product",
    article: "https://example.com/article",
    category: "https://example.com/category",
    profile: "https://example.com/profile",
  },

  // Image links (where images link to)
  image: {
    hero: "https://example.com/campaign",
    product: "https://example.com/product",
    banner: "https://example.com/promo",
    logo: "https://example.com",
  },

  // App stores
  apps: {
    appStore: "https://apps.apple.com/app/yourapp",
    googlePlay: "https://play.google.com/store/apps/details?id=com.yourapp",
  },
} as const;

/** Physical mailing address placeholder */
export const PLACEHOLDER_ADDRESS = "123 Main Street, Suite 100, City, ST 10001";

/** Company name placeholder */
export const PLACEHOLDER_COMPANY = "Your Company";

/** Copyright line */
export function copyrightLine(companyName?: string): string {
  const year = new Date().getFullYear();
  return `© ${year} ${companyName || PLACEHOLDER_COMPANY}. All rights reserved.`;
}
