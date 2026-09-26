package com.redsocial.auth;

import jakarta.validation.constraints.NotBlank;

/**
 * Login data.
 *
 * @param username username or email; a username can never contain "@", so both are unambiguous
 */
public record LoginRequest(
        @NotBlank(message = "es obligatorio") String username,
        @NotBlank(message = "es obligatorio") String password) {
}
