package com.redsocial.feed;

import java.util.List;
import java.util.Map;

import jakarta.enterprise.context.ApplicationScoped;

import org.neo4j.driver.Driver;

import com.redsocial.posts.PostRepository;
import com.redsocial.posts.PostRepository.StoredPost;

@ApplicationScoped
public class DiscoverRepository {
    private final Driver driver;

    public DiscoverRepository(Driver driver) {
        this.driver = driver;
    }

    public record Entry(StoredPost post, long friendsWhoReacted) {
    }

    public List<Entry> find(String userId, int page, int size) {
        // Query C7: counts distinct followed users, not total reactions or paths in the graph,
        // and paginates before counting reactions and comments, like C1.
        return driver.executableQuery("""
                        MATCH (yo:Usuario {id: $viewerId})-[:SIGUE]->(amigo:Usuario)
                              -[:REACCIONA]->(p:Post)<-[:PUBLICA]-(autor:Usuario)
                        WHERE autor <> yo AND NOT (yo)-[:SIGUE]->(autor)
                        WITH p, autor, count(DISTINCT amigo) AS amigosQueReaccionaron
                        ORDER BY amigosQueReaccionaron DESC, p.fecha DESC, p.id DESC
                        SKIP $skip LIMIT $limit
                        RETURN %s, amigosQueReaccionaron
                        ORDER BY amigosQueReaccionaron DESC, p.fecha DESC, p.id DESC
                        """.formatted(PostRepository.PUBLIC_FIELDS))
                .withParameters(Map.of("viewerId", userId, "skip", (long) page * size, "limit", size))
                .execute().records().stream()
                .map(row -> new Entry(PostRepository.map(row), row.get("amigosQueReaccionaron").asLong())).toList();
    }
}
