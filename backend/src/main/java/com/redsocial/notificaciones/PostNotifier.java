package com.redsocial.notificaciones;

import java.util.List;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.event.ObservesAsync;

import org.jboss.logging.Logger;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.redsocial.shared.PostCreated;

/**
 * Sends a Web Push notification to the author's subscribed followers when a post is
 * created. It observes the event asynchronously after the post is committed, so
 * POST /api/posts never waits for the push services.
 */
@ApplicationScoped
public class PostNotifier {

    private static final Logger LOG = Logger.getLogger(PostNotifier.class);
    // Push services cap the encrypted payload at about 4 KB and posts hold up to 5000 characters.
    static final int MAX_BODY = 120;

    private final PushRepository repository;
    private final PushSender sender;
    private final ObjectMapper json;

    public PostNotifier(PushRepository repository, PushSender sender, ObjectMapper json) {
        this.repository = repository;
        this.sender = sender;
        this.json = json;
    }

    void onPost(@ObservesAsync PostCreated event) throws JsonProcessingException {
        if (!sender.enabled()) {
            // Without VAPID keys every delivery would fail; GET /api/push/clave-publica already reports it.
            return;
        }
        List<PushTarget> targets = repository.followersToNotify(event.authorId());
        if (targets.isEmpty()) {
            return;
        }
        String author = repository.username(event.authorId()).orElse("un usuario");
        String payload = json.writeValueAsString(new PushPayload(
                "Nueva publicación de " + author, preview(event.text()), "/posts/" + event.postId()));
        for (PushTarget target : targets) {
            deliver(target, payload);
        }
    }

    // One failing subscription must not stop the others.
    private void deliver(PushTarget target, String payload) {
        try {
            int status = sender.send(target, payload);
            if (status == 404 || status == 410) {
                // The browser unsubscribed or the subscription expired: it will never work again.
                repository.deleteExpired(target.endpoint());
                LOG.infof("Removed expired push subscription of user %s (HTTP %d)", target.usuarioId(), status);
            } else if (status >= 400) {
                LOG.warnf("Push service rejected the notification for user %s (HTTP %d)", target.usuarioId(), status);
            }
        } catch (Exception failure) {
            LOG.errorf(failure, "Push delivery failed for user %s", target.usuarioId());
        }
    }

    static String preview(String text) {
        if (text.codePointCount(0, text.length()) <= MAX_BODY) {
            return text;
        }
        return text.substring(0, text.offsetByCodePoints(0, MAX_BODY - 1)) + "…";
    }
}
