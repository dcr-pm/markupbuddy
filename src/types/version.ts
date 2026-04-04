export interface Version {
  id: string;
  conversation_id: string;
  message_id: string;
  version_number: number;
  html_content: string;
  change_summary: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}
