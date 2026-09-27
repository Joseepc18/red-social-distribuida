package com.redsocial.notificaciones;

import jakarta.validation.constraints.NotBlank;

/** Identifies the subscription to remove. */
public record EndpointRequest(@NotBlank(message = "es obligatorio") String endpoint) {
}
