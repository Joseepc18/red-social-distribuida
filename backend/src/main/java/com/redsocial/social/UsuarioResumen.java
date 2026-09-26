package com.redsocial.social;

/**
 * Public projection of a user inside social-graph lists (followers, followed).
 * Built field by field in Cypher, so private properties such as
 * {@code passwordHash} or {@code email} never leave the database.
 */
public record UsuarioResumen(String id, String username, String nombre) {
}
