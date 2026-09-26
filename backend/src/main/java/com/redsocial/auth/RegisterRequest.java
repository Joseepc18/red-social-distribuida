package com.redsocial.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * Registration data. Username and email are stored in lowercase, so uniqueness is
 * case-insensitive. The password max is 72 because BCrypt only uses the first 72 bytes.
 */
public record RegisterRequest(
        @NotBlank(message = "es obligatorio")
        @Size(min = 3, max = 30, message = "debe tener entre 3 y 30 caracteres")
        @Pattern(regexp = "^[A-Za-z0-9_.]*$", message = "solo admite letras, números, punto y guion bajo")
        String username,

        @NotBlank(message = "es obligatorio")
        @Email(message = "no es un email válido")
        @Size(max = 254, message = "debe tener como máximo 254 caracteres")
        String email,

        @NotBlank(message = "es obligatorio")
        @Size(min = 8, max = 72, message = "debe tener entre 8 y 72 caracteres")
        String password,

        @NotBlank(message = "es obligatorio")
        @Size(max = 60, message = "debe tener como máximo 60 caracteres")
        String nombre) {
}
