package com.redsocial.shared.neo4j;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;
import java.util.Set;

import jakarta.inject.Inject;

import org.junit.jupiter.api.Test;
import org.neo4j.driver.Driver;

import io.quarkus.test.junit.QuarkusTest;

@QuarkusTest
class Neo4jConstraintsTest {

    private static final Set<String> EXPECTED = Set.of(
            "usuario_id", "usuario_username", "usuario_email", "post_id", "comentario_id",
            "conversacion_id", "mensaje_id", "suscripcion_endpoint");

    @Inject
    Driver driver;

    @Inject
    Neo4jConstraints constraints;

    @Test
    void constraintsExistAfterStartup() {
        assertTrue(constraintNames().containsAll(EXPECTED), () -> "Found: " + constraintNames());
    }

    @Test
    void runningTheStartupTaskAgainIsIdempotent() {
        int before = constraintNames().size();

        constraints.onStart(null);

        assertEquals(before, constraintNames().size());
    }

    private List<String> constraintNames() {
        return driver.executableQuery("SHOW CONSTRAINTS YIELD name RETURN name")
                .execute()
                .records()
                .stream()
                .map(r -> r.get("name").asString())
                .toList();
    }
}
