package com.redsocial.feed;

import java.util.List;
import java.util.Map;

import jakarta.enterprise.context.ApplicationScoped;

import org.neo4j.driver.Driver;

import com.redsocial.posts.PostRepository.StoredPost;
import com.redsocial.posts.PostResponse;

@ApplicationScoped
public class FeedRepository {
    private final Driver driver;

    public FeedRepository(Driver driver) {
        this.driver = driver;
    }

    public record Entry(StoredPost post, long reactions, boolean reacted) {
    }

    public List<Entry> find(String userId, int page, int size) {
        // Query C1: paginate before counting reactions, projecting only public fields.
        return driver.executableQuery("""
                        MATCH (yo:Usuario {id: $userId})-[:SIGUE]->(autor:Usuario)-[:PUBLICA]->(p:Post)
                        WITH yo, p, autor
                        ORDER BY p.fecha DESC, p.id DESC
                        SKIP $skip LIMIT $limit
                        RETURN p.id AS id, p.texto AS texto, toString(p.fecha) AS fecha,
                               p.mediaKey AS mediaKey, p.mediaTipo AS mediaTipo,
                               autor.id AS autorId, autor.username AS username, autor.nombre AS nombre,
                               COUNT { (p)<-[:REACCIONA]-() } AS reacciones,
                               EXISTS { (yo)-[:REACCIONA]->(p) } AS reaccionado
                        ORDER BY p.fecha DESC, p.id DESC
                        """)
                .withParameters(Map.of("userId", userId, "skip", (long) page * size, "limit", size))
                .execute().records().stream().map(row -> new Entry(
                        new StoredPost(row.get("id").asString(), row.get("texto").asString(),
                                row.get("fecha").asString(),
                                new PostResponse.Author(row.get("autorId").asString(),
                                        row.get("username").asString(), row.get("nombre").asString()),
                                row.get("mediaKey").asString(null), row.get("mediaTipo").asString(null)),
                        row.get("reacciones").asLong(), row.get("reaccionado").asBoolean())).toList();
    }
}
