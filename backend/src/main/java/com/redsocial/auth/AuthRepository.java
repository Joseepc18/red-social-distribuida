package com.redsocial.auth;

import java.util.Map;
import java.util.Optional;

import jakarta.enterprise.context.ApplicationScoped;

import org.neo4j.driver.Driver;

/**
 * Cypher queries that touch credentials. This is the only place that reads or writes
 * {@code passwordHash}; profile queries live in {@code usuarios} and never project it.
 */
@ApplicationScoped
public class AuthRepository {

    /** Data needed to check a password and issue a token. Never serialized. */
    public record Credentials(String id, String username, String passwordHash) {
    }

    private final Driver driver;

    public AuthRepository(Driver driver) {
        this.driver = driver;
    }

    /**
     * Creates the user node. A duplicate username or email makes Neo4j reject the write
     * through the uniqueness constraints, even when two requests race.
     */
    public void create(String id, String username, String email, String passwordHash, String nombre) {
        driver.executableQuery("""
                        CREATE (:Usuario {id: $id, username: $username, email: $email, passwordHash: $passwordHash,
                                          nombre: $nombre, bio: '', creadoEn: datetime()})
                        """)
                .withParameters(Map.of("id", id, "username", username, "email", email,
                        "passwordHash", passwordHash, "nombre", nombre))
                .execute();
    }

    public boolean usernameExists(String username) {
        return driver.executableQuery("RETURN EXISTS { (:Usuario {username: $username}) } AS existe")
                .withParameters(Map.of("username", username))
                .execute()
                .records()
                .getFirst()
                .get("existe")
                .asBoolean();
    }

    public Optional<Credentials> findCredentials(String username) {
        return driver.executableQuery("""
                        MATCH (u:Usuario {username: $username})
                        RETURN u.id AS id, u.username AS username, u.passwordHash AS passwordHash
                        """)
                .withParameters(Map.of("username", username))
                .execute()
                .records()
                .stream()
                .findFirst()
                .map(r -> new Credentials(r.get("id").asString(), r.get("username").asString(),
                        r.get("passwordHash").asString()));
    }
}
