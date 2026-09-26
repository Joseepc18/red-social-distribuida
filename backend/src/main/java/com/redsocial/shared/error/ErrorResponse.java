package com.redsocial.shared.error;

/**
 * Single error body returned by every endpoint: {@code { "error": "<CODE>", "mensaje": "<text>" }}.
 *
 * @param error   stable machine-readable code (e.g. {@code NO_ENCONTRADO}) the frontend can switch on
 * @param mensaje human-readable message in Spanish, safe to show to the user
 */
public record ErrorResponse(String error, String mensaje) {
}
