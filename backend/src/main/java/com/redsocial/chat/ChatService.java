package com.redsocial.chat;

import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.List;
import java.util.UUID;

import jakarta.enterprise.context.ApplicationScoped;

import org.jboss.logging.Logger;

import com.redsocial.shared.error.ApiException;

@ApplicationScoped
public class ChatService {
    public static final int PAGE_SIZE = 30;
    private static final Logger LOG = Logger.getLogger(ChatService.class);
    private final ChatRepository repository;
    private final ChatBroker broker;
    private final ChatSessions sessions;

    public ChatService(ChatRepository repository, ChatBroker broker, ChatSessions sessions) {
        this.repository = repository;
        this.broker = broker;
        this.sessions = sessions;
    }

    public ConversationResponse create(String actor, String other) {
        if (other == null || other.isBlank()) {
            throw ApiException.badRequest("VALIDACION", "usuarioId es obligatorio");
        }
        if (actor.equals(other)) {
            throw ApiException.badRequest("CHAT_CON_UNO_MISMO", "Elige otro usuario");
        }
        requireUser(actor);
        String pair = actor.compareTo(other) < 0 ? actor + ":" + other : other + ":" + actor;
        String id = UUID.nameUUIDFromBytes(pair.getBytes(StandardCharsets.UTF_8)).toString();
        return repository.create(actor, other, id).orElseThrow(ChatService::missingUser);
    }

    public List<ConversationResponse> conversations(String actor) {
        requireUser(actor);
        return repository.conversations(actor);
    }

    public MessagePage history(String actor, String conversation, String before) {
        if (!repository.participates(actor, conversation)) {
            throw forbidden();
        }
        var cursor = MessageCursor.decode(before, conversation);
        var results = repository.history(actor, conversation, cursor, PAGE_SIZE + 1);
        boolean more = results.size() > PAGE_SIZE;
        var page = more ? results.subList(0, PAGE_SIZE) : results;
        return new MessagePage(page, more ? MessageCursor.encode(page.getLast()) : null);
    }

    public void send(String actor, String conversation, String text) {
        if (conversation == null || conversation.isBlank()) {
            throw ApiException.badRequest("VALIDACION", "conversacionId es obligatorio");
        }
        String normalized = text == null ? "" : text.strip();
        if (normalized.isBlank() || normalized.codePointCount(0, normalized.length()) > 2000) {
            throw ApiException.badRequest("VALIDACION", "texto debe contener entre 1 y 2000 caracteres");
        }
        var saved = repository.save(actor, conversation, UUID.randomUUID().toString(), normalized)
                .orElseThrow(ChatService::forbidden);
        try {
            broker.publish(saved).await().atMost(Duration.ofSeconds(2));
        } catch (RuntimeException failure) {
            // Never log the message or JWT. The committed message remains in the history.
            LOG.warnf("Redis unavailable for chat message %s; delivering locally", saved.mensaje().id());
        }
        // Also cover an interrupted local subscription. Redis echo is deduplicated by id.
        sessions.deliver(saved);
    }

    public void requireUser(String actor) {
        if (!repository.userExists(actor)) {
            throw missingUser();
        }
    }

    private static ApiException missingUser() {
        return ApiException.notFound("USUARIO_NO_ENCONTRADO", "El usuario no existe");
    }

    private static ApiException forbidden() {
        return ApiException.forbidden("NO_PARTICIPA", "No participas en esta conversación");
    }
}
