import { ChatContainer } from "@/components/chat/chat-container";

interface Props {
  params: Promise<{ conversationId: string }>;
}

export default async function ConversationPage({ params }: Props) {
  const { conversationId } = await params;
  return <ChatContainer conversationId={conversationId} />;
}
