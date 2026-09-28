import type { UserSummary } from "./api";

export interface Conversation {
  readonly id: string;
  readonly creadaEn: string;
  readonly participante: UserSummary;
}

export interface ChatMessage {
  readonly id: string;
  readonly conversacionId: string;
  readonly autorId: string;
  readonly texto: string;
  readonly fecha: string;
}

export interface MessagePage {
  readonly mensajes: readonly ChatMessage[];
  readonly siguienteAntes: string | null;
}

export interface ChatMessageEvent {
  readonly tipo: "mensaje";
  readonly mensaje: ChatMessage;
}

export interface ChatErrorEvent {
  readonly tipo: "error";
  readonly error: string;
  readonly mensaje: string;
}

export type ChatEvent = ChatMessageEvent | ChatErrorEvent;
