package com.redsocial.auth;

import jakarta.validation.constraints.NotBlank;

/**
 * Login data.
 */
public record LoginRequest(
        @NotBlank(message = "es obligatorio") String username,
        @NotBlank(message = "es obligatorio") String password) {
}
