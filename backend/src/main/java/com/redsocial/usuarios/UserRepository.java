package com.redsocial.usuarios;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import jakarta.enterprise.context.ApplicationScoped;

import org.neo4j.driver.Driver;
import org.neo4j.driver.Record;

/**
 * Cypher queries over {@code (:Usuario)} profiles. Every query projects explicit fields,
 * never the whole node, so {@code passwordHash} cannot leak into a response.
 */
@ApplicationScoped
public class UserRepository {

    // Follower counts are COUNT {} subqueries: they count relationships without loading the nodes.
    private static final String PROFILE_FIELDS = """
            u.id AS id, u.username AS username, u.nombre AS nombre, u.bio AS bio, u.creadoEn AS creadoEn,
            COUNT { (u)<-[:SIGUE]-(:Usuario) } AS seguidores,
            COUNT { (u)-[:SIGUE]->(:Usuario) } AS seguidos""";

    private final Driver driver;

    public UserRepository(Driver driver) {
        this.driver = driver;
    }

    public Optional<OwnProfile> findOwnProfile(String id) {
        return single("""
                MATCH (u:Usuario {id: $id})
                RETURN u.email AS email, %s
                """.formatted(PROFILE_FIELDS), Map.of("id", id))
                .map(UserRepository::toOwnProfile);
    }

    public Optional<PublicProfile> findPublicProfile(String id) {
        return single("""
                MATCH (u:Usuario {id: $id})
                RETURN %s
                """.formatted(PROFILE_FIELDS), Map.of("id", id))
                .map(UserRepository::toPublicProfile);
    }

    public Optional<OwnProfile> updateProfile(String id, String nombre, String bio) {
        return single("""
                MATCH (u:Usuario {id: $id})
                SET u.nombre = $nombre, u.bio = $bio
                RETURN u.email AS email, %s
                """.formatted(PROFILE_FIELDS), Map.of("id", id, "nombre", nombre, "bio", bio))
                .map(UserRepository::toOwnProfile);
    }

    /**
     * Case-insensitive substring search on username or nombre. It scans the Usuario label,
     * which is fine at this project's scale; a full-text index would be the next step.
     */
    public List<UserSummary> search(String text, int limit) {
        return driver.executableQuery("""
                        MATCH (u:Usuario)
                        WHERE toLower(u.username) CONTAINS toLower($text)
                           OR toLower(u.nombre) CONTAINS toLower($text)
                        RETURN u.id AS id, u.username AS username, u.nombre AS nombre
                        ORDER BY u.username
                        LIMIT $limit
                        """)
                .withParameters(Map.of("text", text, "limit", limit))
                .execute()
                .records()
                .stream()
                .map(r -> new UserSummary(r.get("id").asString(), r.get("username").asString(),
                        r.get("nombre").asString()))
                .toList();
    }

    private Optional<Record> single(String query, Map<String, Object> parameters) {
        return driver.executableQuery(query)
                .withParameters(parameters)
                .execute()
                .records()
                .stream()
                .findFirst();
    }

    private static OwnProfile toOwnProfile(Record r) {
        return new OwnProfile(
                r.get("id").asString(),
                r.get("username").asString(),
                r.get("email").asString(),
                r.get("nombre").asString(),
                r.get("bio").asString(""),
                r.get("creadoEn").asOffsetDateTime(),
                r.get("seguidores").asLong(),
                r.get("seguidos").asLong());
    }

    private static PublicProfile toPublicProfile(Record r) {
        return new PublicProfile(
                r.get("id").asString(),
                r.get("username").asString(),
                r.get("nombre").asString(),
                r.get("bio").asString(""),
                r.get("creadoEn").asOffsetDateTime(),
                r.get("seguidores").asLong(),
                r.get("seguidos").asLong());
    }
}
