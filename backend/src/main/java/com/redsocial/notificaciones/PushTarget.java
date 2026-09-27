package com.redsocial.notificaciones;

/** A follower's browser subscription that must receive a notification. */
public record PushTarget(String usuarioId, String endpoint, String p256dh, String auth) {
}
