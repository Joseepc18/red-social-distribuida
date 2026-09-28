package com.redsocial.feed;

import java.util.List;
import java.util.Map;

import jakarta.enterprise.context.ApplicationScoped;

import org.neo4j.driver.Driver;

import com.redsocial.posts.PostRepository.StoredPost;
import com.redsocial.posts.PostResponse;

@ApplicationScoped
public class DiscoverRepository {
    private final Driver driver;

    public DiscoverRepository(Driver driver) {
        this.driver = driver;
    }

    public record Entry(StoredPost post, long friendsWhoReacted) {
    }

    public List<Entry> find(String userId) {
        // C7 counts distinct followed users, not total reactions or paths in the graph.
        return driver.executableQuery("""
                        MATCH (yo:Usuario {id: $userId})-[:SIGUE]->(amigo:Usuario)
                              -[:REACCIONA]->(p:Post)<-[:PUBLICA]-(autor:Usuario)
                        WHERE autor <> yo AND NOT (yo)-[:SIGUE]->(autor)
                        WITH p, autor, count(DISTINCT amigo) AS amigosQueReaccionaron
                        ORDER BY amigosQueReaccionaron DESC, p.fecha DESC, p.id DESC
                        LIMIT 10
                        RETURN p.id AS id, p.texto AS texto, toString(p.fecha) AS fecha,
                               p.mediaKey AS mediaKey, p.mediaTipo AS mediaTipo,
                               autor.id AS autorId, autor.username AS username, autor.nombre AS nombre,
                               amigosQueReaccionaron
                        ORDER BY amigosQueReaccionaron DESC, p.fecha DESC, p.id DESC
                        """)
                .withParameters(Map.of("userId", userId)).execute().records().stream()
                .map(row -> new Entry(
                        new StoredPost(row.get("id").asString(), row.get("texto").asString(),
                                row.get("fecha").asString(),
                                new PostResponse.Author(row.get("autorId").asString(),
                                        row.get("username").asString(), row.get("nombre").asString()),
                                row.get("mediaKey").asString(null), row.get("mediaTipo").asString(null)),
                        row.get("amigosQueReaccionaron").asLong())).toList();
    }
}
