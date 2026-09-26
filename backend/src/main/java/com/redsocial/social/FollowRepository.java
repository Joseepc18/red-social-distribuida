package com.redsocial.social;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import jakarta.enterprise.context.ApplicationScoped;

import org.neo4j.driver.Driver;
import org.neo4j.driver.Record;
import org.neo4j.driver.Value;

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

    // One row while the followed user exists; deleting a missing (null) relationship is a no-op.
    static final String UNFOLLOW = """
            MATCH (b:Usuario {id: $followedId})
            OPTIONAL MATCH (:Usuario {id: $followerId})-[r:SIGUE]->(b)
            DELETE r
            RETURN b.id AS id
            """;

    // One row with a (possibly empty) list while the user exists, no row when it does not.
    // "u" is kept as grouping key: collect() without one would return a row even for a missing user.
    // collect() skips the null produced by OPTIONAL MATCH when there are no relationships.
    static final String FOLLOWERS = """
            MATCH (u:Usuario {id: $userId})
            OPTIONAL MATCH (u)<-[:SIGUE]-(other:Usuario)
            WITH u, other ORDER BY other.username
            WITH u, collect(other {.id, .username, .nombre}) AS usuarios
            RETURN usuarios
            """;

    static final String FOLLOWED = """
            MATCH (u:Usuario {id: $userId})
            OPTIONAL MATCH (u)-[:SIGUE]->(other:Usuario)
            WITH u, other ORDER BY other.username
            WITH u, collect(other {.id, .username, .nombre}) AS usuarios
            RETURN usuarios
            """;

    private final Driver driver;

    public FollowRepository(Driver driver) {
        this.driver = driver;
    }

    /** @return {@code false} when the follower or the followed user does not exist */
    public boolean follow(String followerId, String followedId) {
        return !run(FOLLOW, Map.of("followerId", followerId, "followedId", followedId)).isEmpty();
    }

    /** @return {@code false} when the followed user does not exist */
    public boolean unfollow(String followerId, String followedId) {
        return !run(UNFOLLOW, Map.of("followerId", followerId, "followedId", followedId)).isEmpty();
    }

    /** @return empty when the user does not exist */
    public Optional<List<UsuarioResumen>> followers(String userId) {
        return users(FOLLOWERS, userId);
    }

    /** @return empty when the user does not exist */
    public Optional<List<UsuarioResumen>> followed(String userId) {
        return users(FOLLOWED, userId);
    }

    private Optional<List<UsuarioResumen>> users(String query, String userId) {
        return run(query, Map.of("userId", userId)).stream()
                .findFirst()
                .map(row -> row.get("usuarios").asList(FollowRepository::toResumen));
    }

    private List<Record> run(String query, Map<String, Object> parameters) {
        return driver.executableQuery(query)
                .withParameters(parameters)
                .execute()
                .records();
    }

    private static UsuarioResumen toResumen(Value user) {
        return new UsuarioResumen(
                user.get("id").asString(),
                user.get("username").asString(),
                user.get("nombre").asString(null));
    }
}
