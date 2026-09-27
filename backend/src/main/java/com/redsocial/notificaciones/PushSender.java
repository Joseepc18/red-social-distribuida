package com.redsocial.notificaciones;

/** Delivers one encrypted notification to the browser's push service. */
public interface PushSender {

    /** @return the HTTP status answered by the push service */
    int send(PushTarget target, String payload) throws Exception;
}
