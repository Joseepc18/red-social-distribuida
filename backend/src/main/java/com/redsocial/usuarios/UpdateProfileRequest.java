package com.redsocial.usuarios;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Editable profile fields. Username and email are not here, so they cannot be changed
 * through this request (unknown JSON fields are ignored).
 *
 * @param bio optional; {@code null} clears it
 */
public record UpdateProfileRequest(
        @NotBlank(message = "es obligatorio")
        @Size(max = 60, message = "debe tener como máximo 60 caracteres")
        String nombre,

        @Size(max = 160, message = "debe tener como máximo 160 caracteres")
        String bio) {
}
