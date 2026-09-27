package com.redsocial.social;

import java.util.List;

/**
 * Degrees of separation between two users: the usernames along the shortest path
 * ({@code cadena}) and its length ({@code grados}). Without a path within 6 hops
 * {@code grados} is {@code null} and {@code cadena} is empty.
 */
public record Separacion(List<String> cadena, Integer grados) {

    static Separacion sinCamino() {
        return new Separacion(List.of(), null);
    }
}
