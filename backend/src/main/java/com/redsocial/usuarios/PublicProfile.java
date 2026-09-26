package com.redsocial.usuarios;

import java.time.OffsetDateTime;

/**
 * Profile any authenticated user can see: no email and no password hash.
 */
public record PublicProfile(
        String id,
        String username,
        String nombre,
        String bio,
        OffsetDateTime creadoEn,
        long seguidores,
        long seguidos) {
}
