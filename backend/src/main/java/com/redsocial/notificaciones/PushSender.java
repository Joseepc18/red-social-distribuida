package com.redsocial.notificaciones;

/** Delivers one encrypted notification to the browser's push service. */
public interface PushSender {

    /** @return {@code false} when the server has no VAPID identity, so nothing can be sent */
    boolean enabled();

    /** @return the HTTP status answered by the push service */
    int send(PushTarget target, String payload) throws Exception;
}
