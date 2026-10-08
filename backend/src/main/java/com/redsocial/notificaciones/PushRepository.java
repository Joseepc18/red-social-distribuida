package com.redsocial.notificaciones;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import jakarta.enterprise.context.ApplicationScoped;

import org.neo4j.driver.Driver;
import org.neo4j.driver.Record;
import org.neo4j.driver.Session;

/** Cypher access to {@code (:Usuario)-[:TIENE_SUSCRIPCION]->(:SuscripcionPush)}. */
@ApplicationScoped
public class PushRepository {

    public enum SubscribeResult {
        SUBSCRIBED, USER_NOT_FOUND, LIMIT_REACHED
    }

    // A write on the user serializes concurrent subscriptions from both backend replicas.
    private static final String LOCK_USER = """
            MATCH (u:Usuario {id: $userId})
            SET u.pushSubscriptionVersion = coalesce(u.pushSubscriptionVersion, 0) + 1
            RETURN u.id AS id
            """;

    private static final String COUNT_USER_SUBSCRIPTIONS = """
            MATCH (u:Usuario {id: $userId})
            OPTIONAL MATCH (u)-[:TIENE_SUSCRIPCION]->(s:SuscripcionPush)
            RETURN count(s) AS total,
                   count(CASE WHEN s.endpoint = $endpoint THEN 1 END) AS existing
            """;

    // MERGE by endpoint (unique constraint). A browser subscription belongs to whoever
    // registered it last, so a shared computer stops notifying the previous user.
    static final String SUBSCRIBE = """
            MATCH (u:Usuario {id: $userId})
            MERGE (s:SuscripcionPush {endpoint: $endpoint})
              ON CREATE SET s.creadaEn = datetime()
            SET s.p256dh = $p256dh, s.auth = $auth
            WITH u, s
            OPTIONAL MATCH (other:Usuario)-[old:TIENE_SUSCRIPCION]->(s)
            WHERE other <> u
            DELETE old
            WITH DISTINCT u, s
            MERGE (u)-[:TIENE_SUSCRIPCION]->(s)
            RETURN s.endpoint AS endpoint
            """;

    // Only the caller's own subscription can be removed.
    static final String UNSUBSCRIBE = """
            MATCH (:Usuario {id: $userId})-[:TIENE_SUSCRIPCION]->(s:SuscripcionPush {endpoint: $endpoint})
            DETACH DELETE s
            """;

    // C6: followers of the author that have a push subscription.
    static final String FOLLOWERS_TO_NOTIFY = """
            MATCH (autor:Usuario {id: $autorId})<-[:SIGUE]-(seg:Usuario)-[:TIENE_SUSCRIPCION]->(s:SuscripcionPush)
            RETURN seg.id AS usuarioId, s.endpoint AS endpoint, s.p256dh AS p256dh, s.auth AS auth
            """;

    static final String DELETE_EXPIRED = """
            MATCH (s:SuscripcionPush {endpoint: $endpoint})
            DETACH DELETE s
            """;

    static final String USERNAME = """
            MATCH (u:Usuario {id: $userId})
            RETURN u.username AS username
            """;

    private final Driver driver;

    public PushRepository(Driver driver) {
        this.driver = driver;
    }

    public SubscribeResult subscribe(String userId, String endpoint, String p256dh, String auth,
            int maxSubscriptions) {
        try (Session session = driver.session()) {
            return session.executeWrite(tx -> {
                if (!tx.run(LOCK_USER, Map.of("userId", userId)).hasNext()) {
                    return SubscribeResult.USER_NOT_FOUND;
                }
                Record count = tx.run(COUNT_USER_SUBSCRIPTIONS,
                        Map.of("userId", userId, "endpoint", endpoint)).single();
                if (count.get("existing").asLong() == 0 && count.get("total").asLong() >= maxSubscriptions) {
                    return SubscribeResult.LIMIT_REACHED;
                }
                tx.run(SUBSCRIBE, Map.of("userId", userId, "endpoint", endpoint,
                        "p256dh", p256dh, "auth", auth)).consume();
                return SubscribeResult.SUBSCRIBED;
            });
        }
    }

    public void unsubscribe(String userId, String endpoint) {
        run(UNSUBSCRIBE, Map.of("userId", userId, "endpoint", endpoint));
    }

    public List<PushTarget> followersToNotify(String authorId) {
        return run(FOLLOWERS_TO_NOTIFY, Map.of("autorId", authorId)).stream()
                .map(r -> new PushTarget(
                        r.get("usuarioId").asString(),
                        r.get("endpoint").asString(),
                        r.get("p256dh").asString(),
                        r.get("auth").asString()))
                .toList();
    }

    public void deleteExpired(String endpoint) {
        run(DELETE_EXPIRED, Map.of("endpoint", endpoint));
    }

    public Optional<String> username(String userId) {
        return run(USERNAME, Map.of("userId", userId)).stream()
                .findFirst()
                .map(r -> r.get("username").asString());
    }

    private List<Record> run(String query, Map<String, Object> parameters) {
        return driver.executableQuery(query)
                .withParameters(parameters)
                .execute()
                .records();
    }
}
