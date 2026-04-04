# MarkupBuddy — Full Product Spec

## What It Is

An AI agent that marketers chat with to build production-ready HTML emails. Conversational interface, any device. No drag-and-drop. Just describe what you want and get pixel-perfect, ESP-ready email HTML.

## Tech Stack

- Framework: Next.js (TypeScript, App Router)
- Styling: Tailwind CSS
- Email Engine: React Email (component library)
- CSS Inlining: Juice
- AI: Anthropic Claude API (generation + vision for screenshots)
- Email Sending (test sends): Resend API
- Database: Supabase (Postgres + Auth)
- Image Hosting: Cloudflare R2
- Hosting: Netlify or Vercel
- Domain: markupbuddy.com

## Core Features (MVP)

### 1. Chat Interface

- Full-screen conversational UI
- Works on desktop, tablet, mobile (responsive)
- Text input + image/file upload
- Agent responses include rendered email preview inline
- Copy HTML button on every email output
- Send Test button on every email output
- Download HTML button
- Desktop/mobile preview toggle (600px vs 375px)
- Dark mode preview toggle

### 2. Multi-Input Processing

The agent accepts:

- **Text prompts** — "Build a welcome email with a hero image, 20% off code, blue CTA"
- **Screenshot/image upload** — upload a screenshot of an email, agent replicates it as clean HTML
- **URL** — paste any URL, agent scrapes the design and rebuilds it
- **View-online link** — paste a "view in browser" link from any marketing email, agent extracts and rebuilds
- **Figma export** — upload a Figma frame/screenshot, agent interprets and builds
- **Canva/Miro export** — upload export image, agent interprets layout
- **Past email HTML** — paste raw HTML, agent converts/improves it
- **Voice (future)** — describe verbally

### 3. Brand Memory System

- Brand profiles stored per user/workspace:
  - Company name
  - Logo URL
  - Primary color, secondary color, accent color
  - Font family
  - Header HTML (saved component)
  - Footer HTML (saved component, legal text, social links, unsubscribe)
  - Tone of voice (formal, casual, playful, etc.)
- Sub-brands — override any brand setting per sub-brand
- Agent auto-applies brand to every email unless told otherwise
- "Switch to [sub-brand]" changes context
- Brand settings editable via chat or settings UI

### 4. Dynamic Scripting / Personalization

Agent outputs HTML with proper scripting for the user's ESP:

- AMPscript (Salesforce Marketing Cloud)
- Liquid (Shopify, Braze, HubSpot)
- Handlebars (Mandrill, Mailchimp transactional)
- Jinja (Python-based ESPs)
- Merge tags (Mailchimp *|FNAME|* style)
- VTL / Velocity (Oracle, Responsys)

Includes:

- Conditional blocks ("Show VIP section only if tier = gold")
- Dynamic content ("Pull in their last purchased product")
- Loops ("Render top 3 recommended products from data feed")
- Fallbacks auto-generated for every dynamic field

### 5. Test Send System

Test User Table:

| Name   | Email         | Client     | Tier     | Custom Fields                |
| ------ | ------------- | ---------- | -------- | ---------------------------- |
| Debbie | debbie@co.com | Outlook    | VIP      | cart_items: 3, city: NYC     |
| Mike   | mike@co.com   | Gmail      | Standard | cart_items: 0, city: LA      |
| Sarah  | sarah@co.com  | Apple Mail | New      | cart_items: 1, city: Chicago |
| Mobile | test@co.com   | iPhone     | -        | -                            |

Commands:

- "Send test to Debbie" → sends current draft to debbie@co.com with her data profile rendering the dynamic content
- "Send test to all" → sends to entire test table
- "Send proof to Debbie and Mike" → just those two
- "Send test" (no name) → sends to yourself (default)
- "Add Jason jason@co.com to test users" → updates table

Test sends include:

- Subject line
- Preheader text
- From name / reply-to (configurable)
- Dynamic content renders with sample data from each test user's profile

### 6. Version History

- Every iteration auto-saved with timestamp
- "Show versions" → list with change summaries
