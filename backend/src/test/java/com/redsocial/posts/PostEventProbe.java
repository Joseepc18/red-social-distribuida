package com.redsocial.posts;

import java.util.Map;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.TimeUnit;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.event.ObservesAsync;
import jakarta.inject.Inject;

import org.neo4j.driver.Driver;

import com.redsocial.shared.PostCreated;

@ApplicationScoped
public class PostEventProbe {
    public record Received(PostCreated event, boolean committed, String thread) {
    }

    private final Map<String, BlockingQueue<Received>> received = new ConcurrentHashMap<>();
    private final Map<String, CountDownLatch> gates = new ConcurrentHashMap<>();

    @Inject
    Driver driver;

    public void onPost(@ObservesAsync PostCreated event) throws InterruptedException {
        boolean committed = driver.executableQuery("""
                        RETURN EXISTS { (:Usuario {id: $author})-[:PUBLICA]->(:Post {id: $post}) } AS committed
                        """)
                .withParameters(Map.of("author", event.authorId(), "post", event.postId()))
                .execute().records().getFirst().get("committed").asBoolean();
        received.computeIfAbsent(event.authorId(), key -> new LinkedBlockingQueue<>())
                .add(new Received(event, committed, Thread.currentThread().getName()));
        CountDownLatch gate = gates.get(event.authorId());
        if (gate != null && !gate.await(10, TimeUnit.SECONDS)) {
            throw new IllegalStateException("Observer was not released by the test");
        }
        if (event.text().equals("observer-failure")) {
            throw new IllegalStateException("Simulated push observer failure");
        }
    }

    public Received await(String authorId, long milliseconds) throws InterruptedException {
        return received.computeIfAbsent(authorId, key -> new LinkedBlockingQueue<>())
                .poll(milliseconds, TimeUnit.MILLISECONDS);
    }

    public CountDownLatch block(String authorId) {
        CountDownLatch gate = new CountDownLatch(1);
        gates.put(authorId, gate);
        return gate;
    }
}
