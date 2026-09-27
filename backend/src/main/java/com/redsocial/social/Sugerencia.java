package com.redsocial.social;

import java.util.List;

/**
 * A suggested user to follow. {@code enComun} counts the followed users that
 * follow the suggestion, {@code conexiones} holds up to 3 of their usernames and
 * {@code seguidores} is the suggestion's total follower count (tie-breaker).
 * On cold start {@code enComun} is 0 and {@code conexiones} is empty.
 */
public record Sugerencia(String id, String username, String nombre,
                         long enComun, List<String> conexiones, long seguidores) {
}
