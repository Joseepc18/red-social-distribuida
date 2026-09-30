package com.redsocial.social;

/**
 * A user reachable through {@code SIGUE} relationships and the minimum number of
 * hops ({@code distancia}, 1 to 3) needed to reach them.
 */
public record Alcanzable(String id, String username, String nombre, long distancia) {
}
