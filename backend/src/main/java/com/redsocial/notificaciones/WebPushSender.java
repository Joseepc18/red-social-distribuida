package com.redsocial.notificaciones;

import java.time.Duration;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

import org.apache.http.HttpResponse;

import nl.martijndwars.webpush.Encoding;
import nl.martijndwars.webpush.Notification;
import nl.martijndwars.webpush.PushService;

/**
 * {@link PushSender} backed by {@code nl.martijndwars:web-push}: encrypts the payload
 * with the subscription keys (p256dh, auth) and signs the request with VAPID, so the
 * push service can deliver it but never read it.
 */
@ApplicationScoped
public class WebPushSender implements PushSender {

    static final Duration TIMEOUT = Duration.ofSeconds(10);

    private final VapidConfig config;
    private final Duration timeout;
    private volatile PushService service;

    @Inject
    public WebPushSender(VapidConfig config) {
        this(config, TIMEOUT);
    }

    WebPushSender(VapidConfig config, Duration timeout) {
        this.config = config;
        this.timeout = timeout;
    }

    @Override
    public boolean enabled() {
        return config.publicKey().isPresent() && config.privateKey().isPresent() && config.subject().isPresent();
    }

    @Override
    public int send(PushTarget target, String payload) throws Exception {
        Notification notification = new Notification(target.endpoint(), target.p256dh(), target.auth(), payload);
        // The library defaults to the legacy "aesgcm" draft; RFC 8291 aes128gcm is the one every browser accepts.
        // Its blocking send() waits forever, so a hung push service would stall the remaining followers.
        Future<HttpResponse> response = service().sendAsync(notification, Encoding.AES128GCM);
        try {
            return response.get(timeout.toMillis(), TimeUnit.MILLISECONDS).getStatusLine().getStatusCode();
        } catch (TimeoutException timedOut) {
            // Cancelling also closes the HTTP client the library created for this request.
            response.cancel(true);
            throw timedOut;
        }
    }

    // Built on first use so the application starts even without VAPID keys.
    private PushService service() throws Exception {
        if (service == null) {
            service = new PushService(
                    config.publicKey().orElseThrow(WebPushSender::notConfigured),
                    config.privateKey().orElseThrow(WebPushSender::notConfigured),
                    config.subject().orElseThrow(WebPushSender::notConfigured));
        }
        return service;
    }

    private static IllegalStateException notConfigured() {
        return new IllegalStateException("VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY and VAPID_SUBJECT must be set");
    }
}
