package com.redsocial.social;

import java.util.Map;
import java.util.UUID;

import org.neo4j.driver.Driver;

import io.smallrye.jwt.build.Jwt;

/**
 * Creates isolated {@code Usuario} nodes directly in Neo4j. Other test classes
 * share the same database, so every user gets a random id and username.
 */
final class TestUsers {

    private final Driver driver;

    TestUsers(Driver driver) {
        this.driver = driver;
    }

    static String uniquePrefix() {
        return "t" + UUID.randomUUID().toString().substring(0, 8) + "_";
    }

    static String tokenFor(String userId) {
        return Jwt.subject(userId).sign();
    }

    /** @return the id of the created user */
    String create(String username) {
        String id = UUID.randomUUID().toString();
        driver.executableQuery("""
                        CREATE (:Usuario {id: $id, username: $username, email: $email,
                                          passwordHash: 'secret-hash', nombre: $nombre,
                                          bio: '', creadoEn: datetime()})
                        """)
                .withParameters(Map.of(
                        "id", id,
                        "username", username,
                        "email", username + "@test.local",
                        "nombre", "Nombre " + username))
                .execute();
        return id;
    }

    String create() {
        return create(uniquePrefix() + "user");
    }
}
