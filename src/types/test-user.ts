export interface TestUser {
  id: string;
  user_id: string;
  name: string;
  email: string;
  client: string | null;
  tier: string | null;
  custom_fields: Record<string, string>;
  created_at: string;
  updated_at: string;
}

export interface TestSend {
  id: string;
  user_id: string;
  conversation_id: string;
  version_id: string | null;
  recipients: TestSendRecipient[];
  subject: string | null;
  from_name: string | null;
  reply_to: string | null;
  sent_at: string;
}

export interface TestSendRecipient {
  test_user_id: string;
  name: string;
  email: string;
  status: "pending" | "sent" | "failed";
  error?: string;
}

export interface TestDataExtension {
  id: string;
  user_id: string;
  conversation_id: string;
  name: string;
  rows: TestDERow[];
  created_at: string;
}

export interface TestDERow {
  [key: string]: string;
}

export interface SendTestRequest {
  conversationId: string;
  html: string;
  recipients: string[];
  subject: string;
  fromName?: string;
  replyTo?: string;
  scriptingEngine?: string;
}
