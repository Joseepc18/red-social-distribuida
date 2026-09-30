package com.redsocial.notificaciones;

import java.util.Map;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.TimeUnit;

import jakarta.annotation.Priority;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.inject.Alternative;

/** Only the external push service is replaced; HTTP, JWT, Cypher and CDI events remain real. */
@Alternative
@Priority(1)
@ApplicationScoped
public class TestPushSender implements PushSender {
    public record Sent(PushTarget target, String payload) {
    }

    private final Map<String, BlockingQueue<Sent>> sent = new ConcurrentHashMap<>();
    private final Map<String, Integer> statuses = new ConcurrentHashMap<>();
    private final Map<String, CountDownLatch> gates = new ConcurrentHashMap<>();
    private volatile boolean enabled = true;

    @Override
    public boolean enabled() {
        return enabled;
    }

    /** Simulates a server started without VAPID keys. */
    public void enabled(boolean value) {
        enabled = value;
    }

    @Override
    public int send(PushTarget target, String payload) throws InterruptedException {
        queue(target.endpoint()).add(new Sent(target, payload));
        CountDownLatch gate = gates.get(target.endpoint());
        if (gate != null && !gate.await(10, TimeUnit.SECONDS)) {
            throw new IllegalStateException("Sender was not released by the test");
        }
        return statuses.getOrDefault(target.endpoint(), 201);
    }

    /** Push service answer for this endpoint (201 by default). */
    public void respond(String endpoint, int status) {
        statuses.put(endpoint, status);
    }

    public CountDownLatch block(String endpoint) {
        CountDownLatch gate = new CountDownLatch(1);
        gates.put(endpoint, gate);
        return gate;
    }

    public Sent await(String endpoint, long milliseconds) throws InterruptedException {
        return queue(endpoint).poll(milliseconds, TimeUnit.MILLISECONDS);
    }

    private BlockingQueue<Sent> queue(String endpoint) {
        return sent.computeIfAbsent(endpoint, key -> new LinkedBlockingQueue<>());
    }
}
