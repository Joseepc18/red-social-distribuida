package com.redsocial.posts;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import jakarta.annotation.Priority;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.inject.Alternative;

import com.redsocial.media.MediaStorage;

/** Only external storage is replaced; HTTP, JWT, Cypher and CDI events remain real. */
@Alternative
@Priority(1)
@ApplicationScoped
public class TestMediaStorage implements MediaStorage {
    public record ObjectData(byte[] bytes, String type) {
    }

    private final Map<String, ObjectData> objects = new ConcurrentHashMap<>();
    private volatile boolean failUploads;

    public Map<String, ObjectData> objects() {
        return objects;
    }

    public void failUploads(boolean fail) {
        failUploads = fail;
    }

    @Override
    public void upload(String key, Path file, String contentType) {
        if (failUploads) {
            throw new IllegalStateException("Simulated S3 outage");
        }
        try {
            objects.put(key, new ObjectData(Files.readAllBytes(file), contentType));
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    @Override
    public void delete(String key) {
        objects.remove(key);
    }
}
