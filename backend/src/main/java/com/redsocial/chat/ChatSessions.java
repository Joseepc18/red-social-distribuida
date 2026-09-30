package com.redsocial.chat;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import jakarta.enterprise.context.ApplicationScoped;

import org.jboss.logging.Logger;

import io.quarkus.websockets.next.CloseReason;
import io.quarkus.websockets.next.WebSocketConnection;

@ApplicationScoped
public class ChatSessions {
    private static final Logger LOG = Logger.getLogger(ChatSessions.class);
    private record Session(WebSocketConnection connection, String user, long expires) {
    }
    private final Map<String, Session> sessions = new ConcurrentHashMap<>();
    private final Map<String, Boolean> delivered = new LinkedHashMap<>();

    public void add(WebSocketConnection connection, String user, long expires) {
        sessions.put(connection.id(), new Session(connection, user, expires));
    }

    public void remove(WebSocketConnection connection) {
        sessions.remove(connection.id());
    }

    public void deliver(ChatEnvelope envelope) {
        synchronized (delivered) {
            if (delivered.putIfAbsent(envelope.mensaje().id(), true) != null) {
                return;
            }
            if (delivered.size() > 4096) {
                delivered.remove(delivered.keySet().iterator().next());
            }
        }
        var event = new ChatEvent(envelope.mensaje());
        for (var session : sessions.values()) {
            if (!session.connection().isOpen() || !envelope.participantes().contains(session.user())) {
                continue;
            }
            if (session.expires() <= Instant.now().getEpochSecond()) {
                session.connection().close(new CloseReason(1008, "JWT vencido")).subscribe().with(v -> {}, e -> {});
                continue;
            }
            session.connection().sendText(event).subscribe().with(v -> {}, failure ->
                    LOG.warnf("Chat delivery failed for connection %s; recover using history", session.connection().id()));
        }
    }
}
