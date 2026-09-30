package com.redsocial.chat;

import java.time.Duration;
import java.util.concurrent.atomic.AtomicBoolean;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.event.Observes;

import org.jboss.logging.Logger;

import io.quarkus.redis.datasource.ReactiveRedisDataSource;
import io.quarkus.redis.datasource.pubsub.ReactivePubSubCommands;
import io.quarkus.redis.datasource.pubsub.ReactivePubSubCommands.ReactiveRedisSubscriber;
import io.quarkus.runtime.ShutdownEvent;
import io.quarkus.runtime.StartupEvent;
import io.smallrye.mutiny.Uni;
import io.vertx.core.Vertx;

@ApplicationScoped
public class RedisChatBroker implements ChatBroker {
    public static final String CHANNEL = "chat";
    private static final Logger LOG = Logger.getLogger(RedisChatBroker.class);
    private final ReactivePubSubCommands<ChatEnvelope> commands;
    private final ChatSessions sessions;
    private final Vertx vertx;
    private final AtomicBoolean connecting = new AtomicBoolean();
    private volatile ReactiveRedisSubscriber subscriber;
    private volatile boolean stopped;
    private long retryTimer = -1;
    private boolean interruptionLogged;

    public RedisChatBroker(ReactiveRedisDataSource redis, ChatSessions sessions, Vertx vertx) {
        this.commands = redis.pubsub(ChatEnvelope.class);
        this.sessions = sessions;
        this.vertx = vertx;
    }

    void start(@Observes StartupEvent event) {
        connect();
    }

    private void connect() {
        if (stopped || !connecting.compareAndSet(false, true)) return;
        commands.subscribe(CHANNEL, sessions::deliver, this::disconnected, error -> disconnected())
                .ifNoItem().after(Duration.ofSeconds(2)).fail()
                .subscribe().with(this::subscriptionRestored, failure -> {
                    connecting.set(false);
                    disconnected();
                });
    }

    private synchronized void subscriptionRestored(ReactiveRedisSubscriber active) {
        connecting.set(false);
        if (stopped) {
            active.unsubscribe().subscribe().with(ignored -> {}, failure -> {});
            return;
        }
        subscriber = active;
        if (interruptionLogged) {
            interruptionLogged = false;
            LOG.info("Chat subscription restored after Redis interruption");
        }
    }

    private synchronized void disconnected() {
        subscriber = null;
        if (stopped || retryTimer != -1) return;
        if (!interruptionLogged) {
            interruptionLogged = true;
            LOG.warn("Chat subscription interrupted; reconnecting to Redis");
        }
        retryTimer = vertx.setTimer(1000, timer -> {
            synchronized (this) {
                retryTimer = -1;
            }
            connect();
        });
    }

    @Override
    public Uni<Void> publish(ChatEnvelope message) {
        return commands.publish(CHANNEL, message).ifNoItem().after(Duration.ofSeconds(2)).fail();
    }

    void stop(@Observes ShutdownEvent event) {
        synchronized (this) {
            stopped = true;
            if (retryTimer != -1) vertx.cancelTimer(retryTimer);
            var active = subscriber;
            if (active != null) active.unsubscribe().subscribe().with(ignored -> {}, failure -> {});
        }
    }
}
