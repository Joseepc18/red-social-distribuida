package com.redsocial.chat;

import java.time.Instant;
import jakarta.inject.Inject;
import org.eclipse.microprofile.jwt.JsonWebToken;
import org.jboss.logging.Logger;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.redsocial.shared.error.ApiException;
import io.quarkus.security.Authenticated;
import io.quarkus.websockets.next.CloseReason;
import io.quarkus.websockets.next.OnClose;
import io.quarkus.websockets.next.OnError;
import io.quarkus.websockets.next.OnOpen;
import io.quarkus.websockets.next.OnTextMessage;
import io.quarkus.websockets.next.WebSocket;
import io.quarkus.websockets.next.WebSocketConnection;

@WebSocket(path = "/ws/chat", endpointId = "chat")
@Authenticated
public class ChatSocket {
    public record ChatError(String tipo, String error, String mensaje) { }
    private static final Logger LOG = Logger.getLogger(ChatSocket.class);
    @Inject ChatService service;
    @Inject ChatSessions sessions;
    @Inject JsonWebToken jwt;
    @Inject ObjectMapper json;

    @OnOpen
    public void open(WebSocketConnection connection) {
        try {
            service.requireUser(jwt.getSubject());
            sessions.add(connection, jwt.getSubject(), jwt.getExpirationTime());
        } catch (ApiException failure) {
            connection.closeAndAwait(new CloseReason(1008, "Usuario no disponible"));
        }
    }

    @OnClose
    public void close(WebSocketConnection connection) { sessions.remove(connection); }

    @OnTextMessage
    public void message(String raw, WebSocketConnection connection) {
        if (jwt.getExpirationTime() <= Instant.now().getEpochSecond()) {
            connection.closeAndAwait(new CloseReason(1008, "JWT vencido"));
            return;
        }
        JsonNode input;
        try { input=json.readTree(raw); }
        catch (JsonProcessingException failure) { throw invalid(); }
        if (input == null || !input.isObject() || !input.path("tipo").isTextual()
                || !input.path("tipo").asText().equals("mensaje")
                || !input.path("conversacionId").isTextual() || !input.path("texto").isTextual()) throw invalid();
        service.send(jwt.getSubject(), input.get("conversacionId").asText(), input.get("texto").asText());
    }

    @OnError
    public void error(Throwable failure, WebSocketConnection connection) {
        if (!connection.isOpen()) return;
        String code="ERROR_INTERNO";
        String message="No se pudo procesar el mensaje";
        if (failure instanceof ApiException api) { code=api.error(); message=api.mensaje(); }
        else LOG.errorf("Chat processing failed on connection %s (%s)", connection.id(), failure.getClass().getSimpleName());
        if (connection.isOpen()) connection.sendTextAndAwait(new ChatError("error", code, message));
    }

    private static ApiException invalid() {
        return ApiException.badRequest("SOLICITUD_INVALIDA", "Usa {tipo:mensaje, conversacionId, texto} con campos de texto");
    }
}
