package com.redsocial.auth;

/**
 * @param token signed JWT, sent back as {@code Authorization: Bearer <token>}
 */
public record LoginResponse(String token) {
}
