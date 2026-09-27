package com.redsocial.notificaciones;

import jakarta.enterprise.context.ApplicationScoped;

import com.redsocial.shared.error.ApiException;

/**
 * Business rules for browser subscriptions. The owner always comes from the JWT,
 * never from the request body.
 */
@ApplicationScoped
public class PushSubscriptionService {

    private final PushRepository repository;
    private final VapidConfig vapid;

    public PushSubscriptionService(PushRepository repository, VapidConfig vapid) {
        this.repository = repository;
        this.vapid = vapid;
    }

    public ClavePublica publicKey() {
        return vapid.publicKey()
                .map(ClavePublica::new)
                .orElseThrow(() -> new ApiException(503, "PUSH_NO_CONFIGURADO",
                        "Las notificaciones push no están configuradas en el servidor"));
    }

    public void subscribe(String userId, SuscripcionRequest request) {
        if (!repository.subscribe(userId, request.endpoint(), request.p256dh(), request.auth())) {
            throw ApiException.notFound("USUARIO_NO_ENCONTRADO", "El usuario no existe");
        }
    }

    public void unsubscribe(String userId, String endpoint) {
        repository.unsubscribe(userId, endpoint);
    }
}
