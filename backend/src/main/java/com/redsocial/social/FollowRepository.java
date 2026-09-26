package com.redsocial.social;

import java.util.List;
import java.util.Map;

import jakarta.enterprise.context.ApplicationScoped;

import org.neo4j.driver.Driver;
import org.neo4j.driver.Record;

/**
 * Cypher access to the {@code (:Usuario)-[:SIGUE {desde}]->(:Usuario)} relationship.
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
}
