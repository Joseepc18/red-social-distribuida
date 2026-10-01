package com.redsocial.usuarios;

import java.util.Collections;
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

    private static final String PROFILE_FIELDS = "u.id AS id, u.username AS username, u.nombre AS nombre, u.bio AS bio";

    private final Driver driver;

    public UserRepository(Driver driver) {
        this.driver = driver;
    }

    public Optional<Profile> findProfile(String id) {
        return single("""
                MATCH (u:Usuario {id: $id})
                RETURN %s
                """.formatted(PROFILE_FIELDS), Map.of("id", id))
                .map(UserRepository::toProfile);
    }

    public Optional<Profile> updateProfile(String id, String nombre, String bio) {
        return single("""
                MATCH (u:Usuario {id: $id})
                SET u.nombre = $nombre, u.bio = $bio
                RETURN %s
                """.formatted(PROFILE_FIELDS), Map.of("id", id, "nombre", nombre, "bio", bio))
                .map(UserRepository::toProfile);
    }

    /**
     * Case-insensitive substring search on username or nombre, limited to the first 10 users
     * by username. A missing text is a null parameter: {@code CONTAINS null} is never true,
     * so the query returns no users.
     */
    public List<UserSummary> search(String text) {
        return driver.executableQuery("""
                        MATCH (u:Usuario)
                        WHERE toLower(u.username) CONTAINS toLower($text)
                           OR toLower(u.nombre) CONTAINS toLower($text)
                        RETURN u.id AS id, u.username AS username, u.nombre AS nombre
                        ORDER BY u.username
                        LIMIT 10
                        """)
                // Map.of rejects null values; singletonMap accepts them
                .withParameters(Collections.singletonMap("text", text))
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

    private static Profile toProfile(Record r) {
        return new Profile(
                r.get("id").asString(),
                r.get("username").asString(),
                r.get("nombre").asString(),
                r.get("bio").asString(""));
    }
}
