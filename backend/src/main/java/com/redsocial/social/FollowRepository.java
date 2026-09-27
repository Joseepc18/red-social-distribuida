package com.redsocial.social;

import java.util.List;
import java.util.Map;

import jakarta.enterprise.context.ApplicationScoped;

import org.neo4j.driver.Driver;
import org.neo4j.driver.Record;
import org.neo4j.driver.Value;

/**
 * Cypher access to the {@code (:Usuario)-[:SIGUE {desde}]->(:Usuario)} relationship
 * and the social-graph queries built on it.
 * Every query uses parameters and projects only public user fields.
 */
@ApplicationScoped
public class FollowRepository {

    // MATCH yields no row when either user is missing, so nothing is created in that case.
    // MERGE makes the operation idempotent and ON CREATE keeps the original "desde".
    static final String FOLLOW = """
            MATCH (a:Usuario {id: $followerId}), (b:Usuario {id: $followedId})
            MERGE (a)-[r:SIGUE]->(b)
              ON CREATE SET r.desde = datetime()
            RETURN r.desde AS desde
            """;

    // Matches nothing when the relationship (or either user) does not exist, so it never fails.
    static final String UNFOLLOW = """
            MATCH (:Usuario {id: $followerId})-[r:SIGUE]->(:Usuario {id: $followedId})
            DELETE r
            """;

    static final String FOLLOWERS = """
            MATCH (u:Usuario {id: $userId})<-[:SIGUE]-(other:Usuario)
            RETURN other.id AS id, other.username AS username, other.nombre AS nombre
            ORDER BY username
            """;

    static final String FOLLOWED = """
            MATCH (u:Usuario {id: $userId})-[:SIGUE]->(other:Usuario)
            RETURN other.id AS id, other.username AS username, other.nombre AS nombre
            ORDER BY username
            """;

    static final String FOLLOWS_ANYONE = """
            RETURN EXISTS { (:Usuario {id: $userId})-[:SIGUE]->(:Usuario) } AS sigue
            """;

    // C2: friends of friends, ranked by how many of my followed users follow them.
    static final String SUGGESTIONS = """
            MATCH (yo:Usuario {id: $userId})-[:SIGUE]->(intermedio:Usuario)-[:SIGUE]->(sug:Usuario)
            WHERE sug <> yo AND NOT (yo)-[:SIGUE]->(sug)
            WITH sug,
                 count(DISTINCT intermedio) AS enComun,
                 collect(DISTINCT intermedio.username)[..3] AS conexiones
            WITH sug, enComun, conexiones, COUNT { (sug)<-[:SIGUE]-() } AS seguidores
            ORDER BY enComun DESC, seguidores DESC
            LIMIT 10
            RETURN sug.id AS id, sug.username AS username, sug.nombre AS nombre,
                   enComun, conexiones, seguidores
            """;

    // C2 cold start: the user follows nobody, so there are no friends of friends yet.
    static final String MOST_FOLLOWED = """
            MATCH (yo:Usuario {id: $userId}), (sug:Usuario)
            WHERE sug <> yo AND NOT (yo)-[:SIGUE]->(sug)
            WITH sug, COUNT { (sug)<-[:SIGUE]-() } AS seguidores
            ORDER BY seguidores DESC
            LIMIT 10
            RETURN sug.id AS id, sug.username AS username, sug.nombre AS nombre,
                   0 AS enComun, [] AS conexiones, seguidores
            """;

    private final Driver driver;

    public FollowRepository(Driver driver) {
        this.driver = driver;
    }

    /** @return {@code false} when the follower or the followed user does not exist */
    public boolean follow(String followerId, String followedId) {
        return !run(FOLLOW, Map.of("followerId", followerId, "followedId", followedId)).isEmpty();
    }

    public void unfollow(String followerId, String followedId) {
        run(UNFOLLOW, Map.of("followerId", followerId, "followedId", followedId));
    }

    public List<UsuarioResumen> followers(String userId) {
        return users(FOLLOWERS, userId);
    }

    public List<UsuarioResumen> followed(String userId) {
        return users(FOLLOWED, userId);
    }

    public boolean followsAnyone(String userId) {
        return run(FOLLOWS_ANYONE, Map.of("userId", userId)).get(0).get("sigue").asBoolean();
    }

    public List<Sugerencia> suggestions(String userId) {
        return suggestions(SUGGESTIONS, userId);
    }

    public List<Sugerencia> mostFollowed(String userId) {
        return suggestions(MOST_FOLLOWED, userId);
    }

    private List<Sugerencia> suggestions(String query, String userId) {
        return run(query, Map.of("userId", userId)).stream()
                .map(FollowRepository::toSugerencia)
                .toList();
    }

    private List<UsuarioResumen> users(String query, String userId) {
        return run(query, Map.of("userId", userId)).stream()
                .map(FollowRepository::toResumen)
                .toList();
    }

    private List<Record> run(String query, Map<String, Object> parameters) {
        return driver.executableQuery(query)
                .withParameters(parameters)
                .execute()
                .records();
    }

    private static UsuarioResumen toResumen(Record r) {
        return new UsuarioResumen(
                r.get("id").asString(),
                r.get("username").asString(),
                r.get("nombre").asString(null));
    }

    private static Sugerencia toSugerencia(Record r) {
        return new Sugerencia(
                r.get("id").asString(),
                r.get("username").asString(),
                r.get("nombre").asString(null),
                r.get("enComun").asLong(),
                r.get("conexiones").asList(Value::asString),
                r.get("seguidores").asLong());
    }
}
