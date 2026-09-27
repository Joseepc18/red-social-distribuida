package com.redsocial.notificaciones;

/** VAPID public key (base64url) the browser passes to {@code pushManager.subscribe}. */
public record ClavePublica(String clavePublica) {
}
