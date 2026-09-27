package com.redsocial.notificaciones;

import jakarta.validation.constraints.NotBlank;

/** Browser subscription from {@code PushSubscription.toJSON()}, with its keys flattened. */
public record SuscripcionRequest(
        @NotBlank(message = "es obligatorio") String endpoint,
        @NotBlank(message = "es obligatorio") String p256dh,
        @NotBlank(message = "es obligatorio") String auth) {
}
