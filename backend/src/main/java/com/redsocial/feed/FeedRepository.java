package com.redsocial.feed;

import java.util.List;
import java.util.Map;

import jakarta.enterprise.context.ApplicationScoped;

import org.neo4j.driver.Driver;

import com.redsocial.posts.PostRepository;
import com.redsocial.posts.PostRepository.StoredPost;

@ApplicationScoped
public class FeedRepository {
    private final Driver driver;

    public FeedRepository(Driver driver) {
        this.driver = driver;
    }

    public List<StoredPost> find(String userId, int page, int size) {
        // Query C1: paginate before counting reactions and comments, projecting only public fields.
        return driver.executableQuery("""
                        MATCH (yo:Usuario {id: $viewerId})-[:SIGUE]->(autor:Usuario)-[:PUBLICA]->(p:Post)
                        WITH p, autor
                        ORDER BY p.fecha DESC, p.id DESC
                        SKIP $skip LIMIT $limit
                        RETURN %s
                        ORDER BY p.fecha DESC, p.id DESC
                        """.formatted(PostRepository.PUBLIC_FIELDS))
                .withParameters(Map.of("viewerId", userId, "skip", (long) page * size, "limit", size))
                .execute().records().stream().map(PostRepository::map).toList();
    }
}
