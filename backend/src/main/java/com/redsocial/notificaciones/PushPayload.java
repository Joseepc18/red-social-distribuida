package com.redsocial.notificaciones;

/** JSON body the Service Worker reads to show the notification and open {@code url}. */
public record PushPayload(String titulo, String cuerpo, String url) {
}
