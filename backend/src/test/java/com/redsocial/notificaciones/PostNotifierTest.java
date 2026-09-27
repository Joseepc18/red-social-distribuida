package com.redsocial.notificaciones;

import static io.restassured.RestAssured.given;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;

import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;

import jakarta.inject.Inject;

import org.junit.jupiter.api.Test;
import org.neo4j.driver.Driver;

import com.fasterxml.jackson.databind.ObjectMapper;

import io.quarkus.test.junit.QuarkusTest;
import io.restassured.http.ContentType;
import io.restassured.response.Response;
import io.smallrye.jwt.build.Jwt;

/** A real POST /api/posts triggers PostCreated; only the push service is simulated. */
@QuarkusTest
class PostNotifierTest {
    @Inject Driver driver;
    @Inject TestPushSender sender;
    @Inject ObjectMapper json;

    @Test
    void notifiesSubscribedFollowersWithTitleBodyAndUrl() throws Exception {
        String author = createUser("autor");
        String follower = createUser("seguidor");
        follow(follower, author);
        String endpoint = subscribe(follower);

        String postId = post(author, "Hola red").then().statusCode(201).extract().path("id");

        TestPushSender.Sent sent = sender.await(endpoint, 5000);
        assertNotNull(sent);
        assertEquals(follower, sent.target().usuarioId());
        assertEquals("key-" + endpoint, sent.target().p256dh());
        assertEquals(Map.of(
                        "titulo", "Nueva publicación de " + username(author),
                        "cuerpo", "Hola red",
                        "url", "/posts/" + postId),
                json.readValue(sent.payload(), Map.class));
    }

    @Test
    void doesNotNotifyNonFollowersOrTheAuthor() throws Exception {
        String author = createUser("autor");
        String stranger = createUser("extrano");
        String strangerEndpoint = subscribe(stranger);
        String authorEndpoint = subscribe(author);
        // Following in the opposite direction does not count.
        follow(author, stranger);

        post(author, "Solo para seguidores").then().statusCode(201);

        assertNull(sender.await(strangerEndpoint, 500));
        assertNull(sender.await(authorEndpoint, 100));
    }

    @Test
    void notifiesEverySubscriptionOfEachFollower() throws Exception {
        String author = createUser("autor");
        String follower = createUser("seguidor");
        follow(follower, author);
        String laptop = subscribe(follower);
        String phone = subscribe(follower);

        post(author, "Dos dispositivos").then().statusCode(201);

        assertNotNull(sender.await(laptop, 5000));
        assertNotNull(sender.await(phone, 5000));
    }

    @Test
    void expiredSubscriptionsAreRemoved() throws Exception {
        String author = createUser("autor");
        String follower = createUser("seguidor");
        follow(follower, author);
        String gone = subscribe(follower);
        String notFound = subscribe(follower);
        String failing = subscribe(follower);
        sender.respond(gone, 410);
        sender.respond(notFound, 404);
        sender.respond(failing, 500);

        post(author, "Limpieza").then().statusCode(201);
        assertNotNull(sender.await(gone, 5000));
        assertNotNull(sender.await(notFound, 5000));
        assertNotNull(sender.await(failing, 5000));

        awaitSubscriptionCount(gone, 0);
        awaitSubscriptionCount(notFound, 0);
        // Other errors may be transient, so the subscription is kept.
        assertEquals(1, subscriptionCount(failing));
    }

    @Test
    void postCreationDoesNotWaitForPushDelivery() throws Exception {
        String author = createUser("autor");
        String follower = createUser("seguidor");
        follow(follower, author);
        String endpoint = subscribe(follower);
        var gate = sender.block(endpoint);
        try {
            Response response = CompletableFuture.supplyAsync(() -> post(author, "Sin esperar"))
                    .get(5, TimeUnit.SECONDS);
            response.then().statusCode(201);
            assertNotNull(sender.await(endpoint, 5000));
            assertEquals(1, gate.getCount(), "HTTP must answer while the push delivery is still pending");
        } finally {
            gate.countDown();
        }
    }

    @Test
    void nothingIsSentWithoutVapidKeys() throws Exception {
        String author = createUser("autor");
        String follower = createUser("seguidor");
        follow(follower, author);
        String endpoint = subscribe(follower);
        sender.enabled(false);
        try {
            post(author, "Sin claves").then().statusCode(201);

            assertNull(sender.await(endpoint, 500));
            assertEquals(1, subscriptionCount(endpoint));
        } finally {
            sender.enabled(true);
        }
    }

    @Test
    void longTextsAreTruncatedInTheNotificationBody() throws Exception {
        String author = createUser("autor");
        String follower = createUser("seguidor");
        follow(follower, author);
        String endpoint = subscribe(follower);

        post(author, "a".repeat(500)).then().statusCode(201);

        TestPushSender.Sent sent = sender.await(endpoint, 5000);
        assertNotNull(sent);
        String body = (String) json.readValue(sent.payload(), Map.class).get("cuerpo");
        assertEquals(PostNotifier.MAX_BODY, body.length());
        assertEquals("a".repeat(PostNotifier.MAX_BODY - 1) + "…", body);
    }

    private String createUser(String prefix) {
        String id = UUID.randomUUID().toString();
        driver.executableQuery("""
                        CREATE (:Usuario {id:$id, username:$username, email:$email, nombre:'Test user',
                                          passwordHash:'never-return-this', bio:'', creadoEn:datetime()})
                        """).withParameters(Map.of("id", id, "username", prefix + "_" + id.substring(0, 8),
                        "email", id + "@test.invalid")).execute();
        return id;
    }

    private String username(String id) {
        return driver.executableQuery("MATCH (u:Usuario {id:$id}) RETURN u.username AS username")
                .withParameters(Map.of("id", id)).execute().records().getFirst().get("username").asString();
    }

    private String subscribe(String user) {
        String endpoint = "https://push.test/" + UUID.randomUUID();
        given().auth().oauth2(token(user)).contentType(ContentType.JSON)
                .body(Map.of("endpoint", endpoint, "p256dh", "key-" + endpoint, "auth", "auth"))
                .post("/api/push/suscripciones")
                .then().statusCode(204);
        return endpoint;
    }

    private void awaitSubscriptionCount(String endpoint, long expected) throws InterruptedException {
        long deadline = System.currentTimeMillis() + 5000;
        while (subscriptionCount(endpoint) != expected && System.currentTimeMillis() < deadline) {
            Thread.sleep(50);
        }
        assertEquals(expected, subscriptionCount(endpoint));
    }

    private long subscriptionCount(String endpoint) {
        return driver.executableQuery("MATCH (s:SuscripcionPush {endpoint:$endpoint}) RETURN count(s) AS n")
                .withParameters(Map.of("endpoint", endpoint)).execute().records().getFirst().get("n").asLong();
    }

    private static String token(String user) {
        return Jwt.subject(user).sign();
    }

    private static void follow(String follower, String followed) {
        given().auth().oauth2(token(follower)).post("/api/usuarios/{id}/seguir", followed)
                .then().statusCode(204);
    }

    private static Response post(String author, String text) {
        return given().auth().oauth2(token(author)).multiPart("texto", text).post("/api/posts");
    }
}
