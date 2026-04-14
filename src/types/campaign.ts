export interface AudienceList {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  contact_count: number;
  created_at: string;
  updated_at: string;
}

export interface Contact {
  id: string;
  user_id: string;
  list_id: string | null;
  email: string;
  first_name: string | null;
  last_name: string | null;
  custom_fields: Record<string, string>;
  status: "active" | "unsubscribed" | "bounced";
  created_at: string;
  updated_at: string;
}

export interface Campaign {
  id: string;
  user_id: string;
  brand_id: string | null;
  conversation_id: string | null;
  name: string;
  subject: string | null;
  preheader: string | null;
  from_name: string | null;
  reply_to: string | null;
  html_content: string;
  list_id: string | null;
  status: "draft" | "scheduled" | "sending" | "sent" | "failed";
  scheduled_at: string | null;
  sent_at: string | null;
  recipient_count: number;
  sent_count: number;
  failed_count: number;
  created_at: string;
  updated_at: string;
}

export interface CampaignSend {
  id: string;
  campaign_id: string;
  contact_id: string;
  status: "pending" | "sent" | "failed" | "bounced";
  error: string | null;
  sent_at: string | null;
  created_at: string;
}
