package com.redsocial.usuarios;

/**
 * User profile returned by every profile endpoint. There is no password field on purpose:
 * the hash never leaves the database.
 */
public record Profile(String id, String username, String nombre, String bio) {
}
