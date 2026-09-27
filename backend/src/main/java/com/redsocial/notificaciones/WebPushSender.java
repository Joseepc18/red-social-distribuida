package com.redsocial.notificaciones;

import jakarta.enterprise.context.ApplicationScoped;

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

    private final VapidConfig config;
    private volatile PushService service;

    public WebPushSender(VapidConfig config) {
        this.config = config;
    }

    @Override
    public int send(PushTarget target, String payload) throws Exception {
        Notification notification = new Notification(target.endpoint(), target.p256dh(), target.auth(), payload);
        // The library defaults to the legacy "aesgcm" draft; RFC 8291 aes128gcm is the one every browser accepts.
        return service().send(notification, Encoding.AES128GCM).getStatusLine().getStatusCode();
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
