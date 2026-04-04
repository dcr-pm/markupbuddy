export interface Message {
  id: string;
  conversation_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  html_output: string | null;
  metadata: MessageMetadata;
  created_at: string;
}

export interface MessageMetadata {
  imageUrl?: string;
  scrapedUrl?: string;
  brandId?: string;
  proofData?: ProofRow[];
  model?: string;
  tokens_used?: number;
}

export interface ProofRow {
  name: string;
  data: Record<string, string>;
  renderedHtml: string;
}

export interface Conversation {
  id: string;
  user_id: string;
  title: string;
  active_brand_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChatState {
  messages: Message[];
  isStreaming: boolean;
  currentHtml: string | null;
  error: string | null;
}

export interface ChatRequest {
  conversationId: string;
  message: string;
  imageUrl?: string;
  scrapedHtml?: string;
  brandContext?: BrandContext | null;
}

export interface BrandContext {
  company_name: string | null;
  logo_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  accent_color: string | null;
  font_family: string | null;
  header_html: string | null;
  footer_html: string | null;
  tone: string | null;
  scripting_engine: string | null;
}
