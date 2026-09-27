package com.redsocial.notificaciones;

import java.util.Optional;

import io.smallrye.config.ConfigMapping;

/** VAPID identity of this server, loaded from the VAPID_* environment variables. */
@ConfigMapping(prefix = "app.push.vapid")
public interface VapidConfig {

    Optional<String> publicKey();

    Optional<String> privateKey();

    Optional<String> subject();
}
