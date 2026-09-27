package com.redsocial.notificaciones;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

/**
 * Browser subscription from {@code PushSubscription.toJSON()}, with its keys flattened.
 * Push services are always HTTPS (RFC 8030); rejecting other schemes keeps the server
 * from posting to internal services of the Docker network, which are plain HTTP.
 */
public record SuscripcionRequest(
        @NotBlank(message = "es obligatorio")
        @Pattern(regexp = "https://.+", message = "debe ser una URL https") String endpoint,
        @NotBlank(message = "es obligatorio") String p256dh,
        @NotBlank(message = "es obligatorio") String auth) {
}
