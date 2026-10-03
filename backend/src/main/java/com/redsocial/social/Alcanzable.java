package com.redsocial.social;

import java.util.List;

import org.eclipse.microprofile.openapi.annotations.media.Schema;

/**
 * A user reachable through {@code SIGUE} relationships, the minimum number of hops
 * ({@code distancia}, 1 to 3) needed to reach them and the usernames in between ({@code via}).
 */
public record Alcanzable(String id, String username, String nombre, long distancia,
        @Schema(description = "Usernames intermedios del camino más corto, en orden; vacía cuando la distancia es 1")
        List<String> via) {
}
