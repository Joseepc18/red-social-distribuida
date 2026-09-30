package com.redsocial.shared.neo4j;

import java.util.List;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.event.Observes;

import org.jboss.logging.Logger;
import org.neo4j.driver.Driver;

import io.quarkus.runtime.StartupEvent;

/**
 * Creates the graph uniqueness constraints when the application starts.
 * Every statement uses {@code IF NOT EXISTS}, so it is safe to run on each
 * startup and from several backend instances at the same time.
 */
@ApplicationScoped
public class Neo4jConstraints {

    private static final Logger LOG = Logger.getLogger(Neo4jConstraints.class);

    static final List<String> STATEMENTS = List.of(
            "CREATE CONSTRAINT usuario_id IF NOT EXISTS FOR (u:Usuario) REQUIRE u.id IS UNIQUE",
            "CREATE CONSTRAINT usuario_username IF NOT EXISTS FOR (u:Usuario) REQUIRE u.username IS UNIQUE",
            "CREATE CONSTRAINT usuario_email IF NOT EXISTS FOR (u:Usuario) REQUIRE u.email IS UNIQUE",
            "CREATE CONSTRAINT post_id IF NOT EXISTS FOR (p:Post) REQUIRE p.id IS UNIQUE",
            "CREATE CONSTRAINT conversacion_id IF NOT EXISTS FOR (c:Conversacion) REQUIRE c.id IS UNIQUE",
            "CREATE CONSTRAINT mensaje_id IF NOT EXISTS FOR (m:Mensaje) REQUIRE m.id IS UNIQUE",
            "CREATE CONSTRAINT suscripcion_endpoint IF NOT EXISTS FOR (s:SuscripcionPush) REQUIRE s.endpoint IS UNIQUE");

    private final Driver driver;

    public Neo4jConstraints(Driver driver) {
        this.driver = driver;
    }

    void onStart(@Observes StartupEvent event) {
        // Schema statements cannot share a transaction with data writes; run each one on its own.
        for (String statement : STATEMENTS) {
            driver.executableQuery(statement).execute();
        }
        LOG.infof("Neo4j constraints ensured (%d)", STATEMENTS.size());
    }
}
