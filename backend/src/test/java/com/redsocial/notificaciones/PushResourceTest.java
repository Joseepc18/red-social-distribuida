package com.redsocial.notificaciones;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.hasKey;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.notNullValue;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.ZonedDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import jakarta.inject.Inject;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.neo4j.driver.Driver;
import org.neo4j.driver.Record;

import io.quarkus.test.junit.QuarkusTest;
import io.restassured.http.ContentType;
import io.restassured.response.Response;
import io.smallrye.jwt.build.Jwt;

@QuarkusTest
class PushResourceTest {
    @Inject Driver driver;

    @Test
    void publicKeyIsPublic() {
        given().get("/api/push/clave-publica")
                .then()
                .statusCode(200)
                .contentType(ContentType.JSON)
                .body("clavePublica", is("test-vapid-public-key"));
    }

    @Test
    void subscribeStoresTheSubscriptionLinkedToTheUser() {
        String user = createUser();
        String endpoint = endpoint();

        subscribe(user, endpoint, "key-1", "auth-1").then().statusCode(204);

        List<Record> subscriptions = subscriptions(endpoint);
        assertEquals(1, subscriptions.size());
        Record s = subscriptions.getFirst();
        assertEquals(user, s.get("owner").asString());
        assertEquals("key-1", s.get("p256dh").asString());
        assertEquals("auth-1", s.get("auth").asString());
        assertTrue(s.get("creadaEn").asZonedDateTime().isBefore(ZonedDateTime.now().plusSeconds(1)));
    }

    @Test
    void subscribingTwiceIsIdempotent() {
        String user = createUser();
        String endpoint = endpoint();

        subscribe(user, endpoint, "key-1", "auth-1").then().statusCode(204);
        ZonedDateTime created = subscriptions(endpoint).getFirst().get("creadaEn").asZonedDateTime();
        subscribe(user, endpoint, "key-2", "auth-2").then().statusCode(204);

        List<Record> subscriptions = subscriptions(endpoint);
        assertEquals(1, subscriptions.size());
        assertEquals(created, subscriptions.getFirst().get("creadaEn").asZonedDateTime());
        assertEquals("key-2", subscriptions.getFirst().get("p256dh").asString());
    }

    @Test
    void existingEndpointMovesToTheAuthenticatedUser() {
        String previous = createUser();
        String current = createUser();
        String endpoint = endpoint();

        subscribe(previous, endpoint, "key", "auth").then().statusCode(204);
        subscribe(current, endpoint, "key", "auth").then().statusCode(204);

        List<Record> subscriptions = subscriptions(endpoint);
        assertEquals(1, subscriptions.size());
        assertEquals(current, subscriptions.getFirst().get("owner").asString());
    }

    @Test
    void subscribeRejectsMissingFields() {
        String user = createUser();

        given().auth().oauth2(token(user)).contentType(ContentType.JSON)
                .body(Map.of("endpoint", endpoint(), "p256dh", "key"))
                .post("/api/push/suscripciones")
                .then()
                .statusCode(400)
                .body("error", is("VALIDACION"));
    }

    @ParameterizedTest
    @ValueSource(strings = {"http://neo4j:7474/db/neo4j/tx", "http://127.0.0.1:9000/media", "ftp://push.test/x",
            "https://"})
    void subscribeRejectsEndpointsThatAreNotHttps(String endpoint) {
        String user = createUser();

        subscribe(user, endpoint, "key", "auth").then()
                .statusCode(400)
                .body("error", is("VALIDACION"));
        assertEquals(0, subscriptions(endpoint).size());
    }

    @Test
    void subscribeWithTokenOfDeletedUserReturns404() {
        String endpoint = endpoint();

        subscribe(UUID.randomUUID().toString(), endpoint, "key", "auth").then()
                .statusCode(404)
                .body("error", is("USUARIO_NO_ENCONTRADO"));
        assertEquals(0, subscriptions(endpoint).size());
    }

    @Test
    void unsubscribeRemovesOnlyTheCallersSubscription() {
        String owner = createUser();
        String other = createUser();
        String endpoint = endpoint();
        subscribe(owner, endpoint, "key", "auth").then().statusCode(204);

        unsubscribe(other, endpoint).then().statusCode(204);
        assertEquals(1, subscriptions(endpoint).size());

        unsubscribe(owner, endpoint).then().statusCode(204);
        assertEquals(0, subscriptions(endpoint).size());
        unsubscribe(owner, endpoint).then().statusCode(204);
    }

    @Test
    void subscriptionEndpointsRequireToken() {
        given().contentType(ContentType.JSON)
                .body(Map.of("endpoint", endpoint(), "p256dh", "key", "auth", "auth"))
                .post("/api/push/suscripciones")
                .then().statusCode(401).body("error", is("NO_AUTENTICADO"));
        given().contentType(ContentType.JSON)
                .body(Map.of("endpoint", endpoint()))
                .delete("/api/push/suscripciones")
                .then().statusCode(401).body("error", is("NO_AUTENTICADO"));
    }

    @Test
    void endpointsAreDocumentedInOpenApi() {
        given().queryParam("format", "json")
                .when().get("/api/openapi")
                .then()
                .statusCode(200)
                .body("paths.'/api/push/clave-publica'.get.tags", contains("Notificaciones"))
                .body("paths.'/api/push/clave-publica'.get.responses.'200'", notNullValue())
                .body("paths.'/api/push/suscripciones'.post.summary", is("Registra la suscripción del navegador"))
                .body("paths.'/api/push/suscripciones'.post.responses.'204'", notNullValue())
                .body("paths.'/api/push/suscripciones'.post.security[0]", hasKey("SecurityScheme"))
                .body("paths.'/api/push/suscripciones'.delete.responses.'204'", notNullValue());
    }

    private String createUser() {
        String id = UUID.randomUUID().toString();
        driver.executableQuery("""
                        CREATE (:Usuario {id:$id, username:$id, email:$email, nombre:'Test user',
                                          passwordHash:'never-return-this', bio:'', creadoEn:datetime()})
                        """).withParameters(Map.of("id", id, "email", id + "@test.invalid")).execute();
        return id;
    }

    private List<Record> subscriptions(String endpoint) {
        return driver.executableQuery("""
                        MATCH (s:SuscripcionPush {endpoint:$endpoint})
                        OPTIONAL MATCH (u:Usuario)-[:TIENE_SUSCRIPCION]->(s)
                        RETURN u.id AS owner, s.p256dh AS p256dh, s.auth AS auth, s.creadaEn AS creadaEn
                        """).withParameters(Map.of("endpoint", endpoint)).execute().records();
    }

    private static String endpoint() {
        return "https://push.test/" + UUID.randomUUID();
    }

    private static String token(String user) {
        return Jwt.subject(user).sign();
    }

    private static Response subscribe(String user, String endpoint, String p256dh, String auth) {
        return given().auth().oauth2(token(user)).contentType(ContentType.JSON)
                .body(Map.of("endpoint", endpoint, "p256dh", p256dh, "auth", auth))
                .post("/api/push/suscripciones");
    }

    private static Response unsubscribe(String user, String endpoint) {
        return given().auth().oauth2(token(user)).contentType(ContentType.JSON)
                .body(Map.of("endpoint", endpoint))
                .delete("/api/push/suscripciones");
    }
}
