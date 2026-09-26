package com.redsocial.auth;

import com.redsocial.usuarios.OwnProfile;

/**
 * @param token   signed JWT, sent back as {@code Authorization: Bearer <token>}
 * @param usuario profile of the logged-in user
 */
public record LoginResponse(String token, OwnProfile usuario) {
}
