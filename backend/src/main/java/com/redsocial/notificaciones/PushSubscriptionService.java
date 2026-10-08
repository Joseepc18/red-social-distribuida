package com.redsocial.notificaciones;

import jakarta.enterprise.context.ApplicationScoped;

import org.eclipse.microprofile.config.inject.ConfigProperty;

import com.redsocial.shared.error.ApiException;

/**
 * Business rules for browser subscriptions. The owner always comes from the JWT,
 * never from the request body.
 */
@ApplicationScoped
public class PushSubscriptionService {

    private final PushRepository repository;
    private final VapidConfig vapid;
    private final int maxSubscriptions;

    public PushSubscriptionService(PushRepository repository, VapidConfig vapid,
            @ConfigProperty(name = "app.push.max-subscriptions-per-user", defaultValue = "10") int maxSubscriptions) {
        this.repository = repository;
        this.vapid = vapid;
        if (maxSubscriptions < 1) {
            throw new IllegalArgumentException("app.push.max-subscriptions-per-user must be positive");
        }
        this.maxSubscriptions = maxSubscriptions;
    }

    public ClavePublica publicKey() {
        return vapid.publicKey()
                .map(ClavePublica::new)
                .orElseThrow(() -> new ApiException(503, "PUSH_NO_CONFIGURADO",
                        "Las notificaciones push no están configuradas en el servidor"));
    }

    public void subscribe(String userId, SuscripcionRequest request) {
        switch (repository.subscribe(userId, request.endpoint(), request.p256dh(), request.auth(), maxSubscriptions)) {
            case USER_NOT_FOUND -> throw ApiException.notFound("USUARIO_NO_ENCONTRADO", "El usuario no existe");
            case LIMIT_REACHED -> throw ApiException.conflict("LIMITE_SUSCRIPCIONES",
                    "Alcanzaste el máximo de suscripciones push por usuario");
            case SUBSCRIBED -> { }
        }
    }

    public void unsubscribe(String userId, String endpoint) {
        repository.unsubscribe(userId, endpoint);
    }
}
