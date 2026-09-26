package com.redsocial.usuarios;

import java.time.OffsetDateTime;

/**
 * Profile of the authenticated user. Includes the email, which is only shown to its owner.
 * There is no password field on purpose: the hash never leaves the database.
 */
public record OwnProfile(
        String id,
        String username,
        String email,
        String nombre,
        String bio,
        OffsetDateTime creadoEn,
        long seguidores,
        long seguidos) {
}
