import { useCallback, useEffect, useRef, useState } from "react";
import { chatCopy } from "../content/chat-copy";
import { chat } from "../services/chat";
import type { ChatEvent, ChatMessage } from "../types/chat";

type ConnectionStatus = "connecting" | "connected" | "reconnecting";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseEvent(value: unknown): ChatEvent | undefined {
  if (!isRecord(value)) return undefined;
  if (value.tipo === "error") {
    if (typeof value.error !== "string" || typeof value.mensaje !== "string")
      return undefined;
    return {
      tipo: "error",
      error: value.error,
      mensaje: value.mensaje,
    };
  }
  if (value.tipo !== "mensaje" || !isRecord(value.mensaje)) return undefined;
  const message = value.mensaje;
  if (
    typeof message.id !== "string" ||
    typeof message.conversacionId !== "string" ||
    typeof message.autorId !== "string" ||
    typeof message.texto !== "string" ||
    typeof message.fecha !== "string"
  )
    return undefined;
  return {
    tipo: "mensaje",
    mensaje: {
      id: message.id,
      conversacionId: message.conversacionId,
      autorId: message.autorId,
      texto: message.texto,
      fecha: message.fecha,
    },
  };
}

export function useChatConnection(
  token: string | undefined,
  onMessage: (message: ChatMessage) => void,
  onReconnect: () => void,
) {
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const [serverError, setServerError] = useState("");
  const socketRef = useRef<WebSocket | null>(null);
  const callbacks = useRef({ onMessage, onReconnect });

  useEffect(() => {
    callbacks.current = { onMessage, onReconnect };
  }, [onMessage, onReconnect]);

  useEffect(() => {
    if (!token) return;
    const jwt = token;
    let disposed = false;
    let openedOnce = false;
    let failedBeforeOpen = false;
    let retryDelay = 1000;
    let retryTimer: number | undefined;

    function connect() {
      if (disposed) return;
      const socket = new WebSocket(chat.socketUrl(jwt));
      socketRef.current = socket;
      socket.addEventListener("open", () => {
        if (disposed) return;
        const reconnected = openedOnce || failedBeforeOpen;
        openedOnce = true;
        failedBeforeOpen = false;
        retryDelay = 1000;
        setStatus("connected");
        setServerError("");
        if (reconnected) callbacks.current.onReconnect();
      });
      socket.addEventListener("message", (event: MessageEvent<unknown>) => {
        if (typeof event.data !== "string") return;
        try {
          const parsed = parseEvent(JSON.parse(event.data) as unknown);
          if (!parsed) return;
          if (parsed.tipo === "mensaje")
            callbacks.current.onMessage(parsed.mensaje);
          else setServerError(parsed.mensaje || chatCopy.sendError);
        } catch {
          setServerError(chatCopy.sendError);
        }
      });
      socket.addEventListener("close", () => {
        if (disposed) return;
        if (!openedOnce) failedBeforeOpen = true;
        socketRef.current = null;
        setStatus("reconnecting");
        retryTimer = window.setTimeout(connect, retryDelay);
        retryDelay = Math.min(retryDelay * 2, 30000);
      });
      socket.addEventListener("error", () => socket.close());
    }

    connect();
    return () => {
      disposed = true;
      if (retryTimer !== undefined) window.clearTimeout(retryTimer);
      socketRef.current?.close();
      socketRef.current = null;
    };
  }, [token]);

  const send = useCallback((conversacionId: string, texto: string) => {
    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) return false;
    socket.send(JSON.stringify({ tipo: "mensaje", conversacionId, texto }));
    setServerError("");
    return true;
  }, []);

  return { status, serverError, send };
}
