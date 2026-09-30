import { createContext, useContext } from "react";
import type { ChatMessage, Conversation } from "../types/chat";
export interface ConversationHistory {
  readonly messages: readonly ChatMessage[];
  readonly nextCursor: string | null;
  readonly loaded: boolean;
  readonly loading: boolean;
  readonly error: string;
  readonly failedBefore: string | null;
}
export interface ChatState {
  readonly conversations: readonly Conversation[];
  readonly loading: boolean;
  readonly error?: string;
  readonly reload: () => void;
  readonly histories: Readonly<Record<string, ConversationHistory>>;
  readonly drafts: Readonly<Record<string, string>>;
  readonly unread: Readonly<Record<string, number>>;
  readonly status: "connecting" | "connected" | "reconnecting";
  readonly serverError: string;
  readonly floatingId: string | null;
  readonly dockOpen: boolean;
  readonly setDockOpen: (open: boolean) => void;
  readonly openConversation: (id: string) => void;
  readonly showList: () => void;
  readonly loadHistory: (id: string, before?: string | null) => Promise<void>;
  readonly markRead: (id: string) => void;
  readonly setVisible: (id: string, visible: boolean) => void;
  readonly setDraft: (id: string, text: string) => void;
  readonly send: (id: string) => boolean;
}
export const ChatContext = createContext<ChatState | null>(null);
export function useChat() {
  const value = useContext(ChatContext);
  if (!value) throw new Error("ChatProvider is required");
  return value;
}
