package com.redsocial.posts;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import jakarta.enterprise.context.ApplicationScoped;

import org.neo4j.driver.Driver;
import org.neo4j.driver.Record;

import com.redsocial.comentarios.CommentRepository;

/** Explicit Cypher projections: no user credentials, binaries or public URLs in the graph. */
@ApplicationScoped
public class PostRepository {
    /**
     * The only projection of a post, shared by C1, C7, the detail and the profile: public fields and
     * counters. Needs {@code p} (the post), {@code autor} (its author) and the {@code $viewerId} parameter.
     * A new field is added here once and reaches every listing.
     */
    public static final String PUBLIC_FIELDS = """
            p.id AS id, p.texto AS texto, toString(p.fecha) AS fecha,
            p.mediaKey AS mediaKey, p.mediaTipo AS mediaTipo,
            autor.id AS autorId, autor.username AS username, autor.nombre AS nombre,
            COUNT { (p)<-[:REACCIONA]-() } AS reacciones,
            EXISTS { (:Usuario {id: $viewerId})-[:REACCIONA]->(p) } AS reaccionado,
            %s AS comentarios""".formatted(CommentRepository.COUNT_OF_POST);
    private final Driver driver;

    public PostRepository(Driver driver) {
        this.driver = driver;
    }

    /**
     * @param reacted whether the viewer reacted to the post
     * @param comments every comment of the post, replies included
     */
    public record StoredPost(String id, String text, String date, PostResponse.Author author,
            String mediaKey, String mediaType, long reactions, boolean reacted, long comments) {
    }

    /** execute() consumes the result and commits before returning to the event producer. */
    public Optional<StoredPost> create(String id, String authorId, String text, String key, String type) {
        Map<String, Object> parameters = new HashMap<>();
        parameters.put("id", id);
        parameters.put("viewerId", authorId);
        parameters.put("text", text);
        parameters.put("key", key);
        parameters.put("type", type);
        return driver.executableQuery("""
                        MATCH (autor:Usuario {id: $viewerId})
                        CREATE (autor)-[:PUBLICA]->(p:Post {id: $id, texto: $text, fecha: datetime(),
                                                          mediaKey: $key, mediaTipo: $type})
                        RETURN %s
                        """.formatted(PUBLIC_FIELDS))
                .withParameters(parameters).execute().records().stream().findFirst().map(PostRepository::map);
    }

    public Optional<StoredPost> find(String id, String viewerId) {
        return driver.executableQuery("""
                        MATCH (autor:Usuario)-[:PUBLICA]->(p:Post {id: $id})
                        RETURN %s
                        """.formatted(PUBLIC_FIELDS))
                .withParameters(Map.of("id", id, "viewerId", viewerId))
                .execute().records().stream().findFirst().map(PostRepository::map);
    }

    public boolean exists(String id) {
        return driver.executableQuery("RETURN EXISTS { (:Post {id: $id}) } AS exists")
                .withParameters(Map.of("id", id)).execute().records().getFirst().get("exists").asBoolean();
    }

    /**
     * One reaction per user and post: MERGE never duplicates it and ON CREATE keeps the original date.
     *
     * @return {@code false} when the user or the post does not exist
     */
    public boolean react(String userId, String postId, String type) {
        return !driver.executableQuery("""
                        MATCH (u:Usuario {id: $userId}), (p:Post {id: $postId})
                        MERGE (u)-[r:REACCIONA]->(p)
                          ON CREATE SET r.tipo = $type, r.fecha = datetime()
                        RETURN r.fecha AS fecha
                        """)
                .withParameters(Map.of("userId", userId, "postId", postId, "type", type))
                .execute().records().isEmpty();
    }

    /** Matches nothing when there is no reaction, so it never fails. */
    public void unreact(String userId, String postId) {
        driver.executableQuery("""
                        MATCH (:Usuario {id: $userId})-[r:REACCIONA]->(:Post {id: $postId})
                        DELETE r
                        """)
                .withParameters(Map.of("userId", userId, "postId", postId)).execute();
    }

    public boolean authorExists(String id) {
        return driver.executableQuery("RETURN EXISTS { (:Usuario {id: $id}) } AS exists")
                .withParameters(Map.of("id", id)).execute().records().getFirst().get("exists").asBoolean();
    }

    public List<StoredPost> byAuthor(String id, String viewerId, int page, int size) {
        return driver.executableQuery("""
                        MATCH (autor:Usuario {id: $id})-[:PUBLICA]->(p:Post)
                        WITH autor, p
                        ORDER BY p.fecha DESC, p.id DESC
                        SKIP $skip LIMIT $limit
                        RETURN %s
                        ORDER BY p.fecha DESC, p.id DESC
                        """.formatted(PUBLIC_FIELDS))
                .withParameters(Map.of("id", id, "viewerId", viewerId, "skip", (long) page * size, "limit", size))
                .execute().records().stream().map(PostRepository::map).toList();
    }

    /** The only mapping from a {@link #PUBLIC_FIELDS} row to a post. */
    public static StoredPost map(Record row) {
        return new StoredPost(row.get("id").asString(), row.get("texto").asString(), row.get("fecha").asString(),
                new PostResponse.Author(row.get("autorId").asString(), row.get("username").asString(),
                        row.get("nombre").asString()),
                row.get("mediaKey").asString(null), row.get("mediaTipo").asString(null),
                row.get("reacciones").asLong(), row.get("reaccionado").asBoolean(),
                row.get("comentarios").asLong());
    }
}
