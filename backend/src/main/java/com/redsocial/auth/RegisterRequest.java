package com.redsocial.auth;

import jakarta.validation.constraints.NotBlank;

/**
 * Registration data. Every field is required.
 */
public record RegisterRequest(
        @NotBlank(message = "es obligatorio") String username,
        @NotBlank(message = "es obligatorio") String email,
        @NotBlank(message = "es obligatorio") String password,
        @NotBlank(message = "es obligatorio") String nombre) {
}
