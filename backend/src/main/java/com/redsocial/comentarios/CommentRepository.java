package com.redsocial.comentarios;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import jakarta.enterprise.context.ApplicationScoped;

import org.neo4j.driver.Driver;
import org.neo4j.driver.Record;

import com.redsocial.usuarios.UserSummary;

/**
 * Direct comments hang from the post with EN; replies only point to their parent with RESPONDE_A,
 * so a whole thread is reached by walking RESPONDE_A back from the direct comments.
 */
@ApplicationScoped
public class CommentRepository {
    /** Longest reply chain the queries follow: every variable-length path keeps a hop limit. */
    public static final int MAX_DEPTH = 50;
    /** Every comment of the post bound to {@code p}, replies included; a tree has one path per comment. */
    public static final String COUNT_OF_POST =
            "COUNT { (p)<-[:EN]-(:Comentario)<-[:RESPONDE_A*0.." + MAX_DEPTH + "]-(:Comentario) }";
    private static final String FIELDS = """
            c.id AS id, c.texto AS texto, toString(c.fecha) AS fecha,
            autor.id AS autorId, autor.username AS username, autor.nombre AS nombre""";
    private final Driver driver;

    public CommentRepository(Driver driver) {
        this.driver = driver;
    }

    public boolean postExists(String id) {
        return exists("RETURN EXISTS { (:Post {id: $id}) } AS exists", id);
    }

    public boolean userExists(String id) {
        return exists("RETURN EXISTS { (:Usuario {id: $id}) } AS exists", id);
    }

    public Optional<CommentResponse> comment(String id, String authorId, String postId, String text) {
        return driver.executableQuery("""
                        MATCH (autor:Usuario {id: $authorId}), (p:Post {id: $postId})
                        CREATE (autor)-[:COMENTA]->(c:Comentario {id: $id, texto: $text, fecha: datetime()})
                               -[:EN]->(p)
                        RETURN %s, null AS respondeA, 0 AS respuestas
                        """.formatted(FIELDS))
                .withParameters(Map.of("id", id, "authorId", authorId, "postId", postId, "text", text))
                .execute().records().stream().findFirst().map(CommentRepository::map);
    }

    /** Empty when the parent comment does not exist or belongs to another post. */
    public Optional<CommentResponse> reply(String id, String authorId, String postId, String parentId,
            String text) {
        return driver.executableQuery("""
                        MATCH (autor:Usuario {id: $authorId}), (padre:Comentario {id: $parentId})
                        WHERE EXISTS { (padre)-[:RESPONDE_A*0..%d]->(:Comentario)-[:EN]->(:Post {id: $postId}) }
                        CREATE (autor)-[:COMENTA]->(c:Comentario {id: $id, texto: $text, fecha: datetime()})
                               -[:RESPONDE_A]->(padre)
                        RETURN %s, padre.id AS respondeA, 0 AS respuestas
                        """.formatted(MAX_DEPTH, FIELDS))
                .withParameters(Map.of("id", id, "authorId", authorId, "postId", postId,
                        "parentId", parentId, "text", text))
                .execute().records().stream().findFirst().map(CommentRepository::map);
    }

    public List<CommentResponse> thread(String postId) {
        // Query C8: from the direct comments, walk the replies down to MAX_DEPTH levels.
        return driver.executableQuery("""
                        MATCH (:Post {id: $postId})<-[:EN]-(:Comentario)<-[:RESPONDE_A*0..%d]-(c:Comentario)
                        MATCH (autor:Usuario)-[:COMENTA]->(c)
                        OPTIONAL MATCH (c)-[:RESPONDE_A]->(padre:Comentario)
                        RETURN %s, padre.id AS respondeA,
                               COUNT { (c)<-[:RESPONDE_A]-(:Comentario) } AS respuestas
                        ORDER BY c.fecha ASC, c.id ASC
                        """.formatted(MAX_DEPTH, FIELDS))
                .withParameters(Map.of("postId", postId))
                .execute().records().stream().map(CommentRepository::map).toList();
    }

    private boolean exists(String query, String id) {
        return driver.executableQuery(query).withParameters(Map.of("id", id))
                .execute().records().getFirst().get("exists").asBoolean();
    }

    private static CommentResponse map(Record row) {
        return new CommentResponse(row.get("id").asString(), row.get("texto").asString(),
                row.get("fecha").asString(),
                new UserSummary(row.get("autorId").asString(), row.get("username").asString(),
                        row.get("nombre").asString()),
                row.get("respondeA").asString(null), row.get("respuestas").asLong());
    }
}
