package com.redsocial.posts;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import jakarta.enterprise.context.ApplicationScoped;

import org.neo4j.driver.Driver;
import org.neo4j.driver.Record;

/** Explicit Cypher projections: no user credentials, binaries or public URLs in the graph. */
@ApplicationScoped
public class PostRepository {
    private static final String FIELDS = """
            p.id AS id, p.texto AS texto, toString(p.fecha) AS fecha,
            p.mediaKey AS mediaKey, p.mediaTipo AS mediaTipo,
            u.id AS authorId, u.username AS username, u.nombre AS nombre
            """;
    private final Driver driver;

    public PostRepository(Driver driver) {
        this.driver = driver;
    }

    public record StoredPost(String id, String text, String date, PostResponse.Author author,
            String mediaKey, String mediaType) {
    }

    /** execute() consumes the result and commits before returning to the event producer. */
    public Optional<StoredPost> create(String id, String authorId, String text, String key, String type) {
        Map<String, Object> parameters = new HashMap<>();
        parameters.put("id", id);
        parameters.put("authorId", authorId);
        parameters.put("text", text);
        parameters.put("key", key);
        parameters.put("type", type);
        return driver.executableQuery("""
                        MATCH (u:Usuario {id: $authorId})
                        CREATE (u)-[:PUBLICA]->(p:Post {id: $id, texto: $text, fecha: datetime(),
                                                      mediaKey: $key, mediaTipo: $type})
                        RETURN %s
                        """.formatted(FIELDS))
                .withParameters(parameters).execute().records().stream().findFirst().map(PostRepository::map);
    }

    public Optional<StoredPost> find(String id) {
        return driver.executableQuery("""
                        MATCH (u:Usuario)-[:PUBLICA]->(p:Post {id: $id})
                        RETURN %s
                        """.formatted(FIELDS))
                .withParameters(Map.of("id", id)).execute().records().stream().findFirst().map(PostRepository::map);
    }

    public boolean authorExists(String id) {
        return driver.executableQuery("RETURN EXISTS { (:Usuario {id: $id}) } AS exists")
                .withParameters(Map.of("id", id)).execute().records().getFirst().get("exists").asBoolean();
    }

    public List<StoredPost> byAuthor(String id, int page, int size) {
        return driver.executableQuery("""
                        MATCH (u:Usuario {id: $id})-[:PUBLICA]->(p:Post)
                        RETURN %s
                        ORDER BY p.fecha DESC, p.id DESC
                        SKIP $skip LIMIT $limit
                        """.formatted(FIELDS))
                .withParameters(Map.of("id", id, "skip", (long) page * size, "limit", size))
                .execute().records().stream().map(PostRepository::map).toList();
    }

    private static StoredPost map(Record row) {
        return new StoredPost(row.get("id").asString(), row.get("texto").asString(), row.get("fecha").asString(),
                new PostResponse.Author(row.get("authorId").asString(), row.get("username").asString(),
                        row.get("nombre").asString()),
                row.get("mediaKey").asString(null), row.get("mediaTipo").asString(null));
    }
}
