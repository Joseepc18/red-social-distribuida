package com.redsocial.usuarios;

import jakarta.validation.constraints.NotBlank;

/**
 * Editable profile fields. Username and email are not here, so they cannot be changed
 * through this request (unknown JSON fields are ignored).
 *
 * @param bio optional; {@code null} clears it
 */
public record UpdateProfileRequest(
        @NotBlank(message = "es obligatorio") String nombre,
        String bio) {
}
