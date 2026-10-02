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
    private static final String FIELDS = """
            p.id AS id, p.texto AS texto, toString(p.fecha) AS fecha,
            p.mediaKey AS mediaKey, p.mediaTipo AS mediaTipo,
            u.id AS authorId, u.username AS username, u.nombre AS nombre,
            %s AS comentarios
            """.formatted(CommentRepository.COUNT_OF_POST);
    private final Driver driver;

    public PostRepository(Driver driver) {
        this.driver = driver;
    }

    /** @param comments every comment of the post, replies included */
    public record StoredPost(String id, String text, String date, PostResponse.Author author,
            String mediaKey, String mediaType, long comments) {
        /** For listings that do not count comments, such as discover (C7). */
        public StoredPost(String id, String text, String date, PostResponse.Author author,
                String mediaKey, String mediaType) {
            this(id, text, date, author, mediaKey, mediaType, 0);
        }
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
                row.get("mediaKey").asString(null), row.get("mediaTipo").asString(null),
                row.get("comentarios").asLong());
    }
}
