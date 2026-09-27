package com.redsocial.shared;

/**
 * In-process CDI event emitted asynchronously after a post is committed to Neo4j.
 * Consumers use @ObservesAsync; no request context or security token is required.
 */
public record PostCreated(String postId, String authorId, String text) {
}
