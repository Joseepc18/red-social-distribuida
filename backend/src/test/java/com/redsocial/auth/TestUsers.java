package com.redsocial.auth;

import static io.restassured.RestAssured.given;

import java.util.Map;
import java.util.UUID;

import io.restassured.http.ContentType;

/**
 * Creates users through the real API. Names are random because every test class shares
 * the same Neo4j instance; nothing is ever wiped.
 */
public final class TestUsers {

    public static final String PASSWORD = "secreto-123";

    public record TestUser(String id, String username, String email, String token) {
    }

    private TestUsers() {
    }

    public static String randomUsername() {
        return "u_" + UUID.randomUUID().toString().replace("-", "").substring(0, 12);
    }

    public static Map<String, Object> registration(String username, String email) {
        return Map.of("username", username, "email", email, "password", PASSWORD, "nombre", "Nombre " + username);
    }

    /** Registers a new user and logs in, returning its id and a valid token. */
    public static TestUser create() {
        String username = randomUsername();
        String email = username + "@test.com";
        String id = given()
                .contentType(ContentType.JSON)
                .body(registration(username, email))
                .when().post("/api/auth/registro")
                .then().statusCode(201)
                .extract().path("id");
        return new TestUser(id, username, email, login(username, PASSWORD));
    }

    public static String login(String username, String password) {
        return given()
                .contentType(ContentType.JSON)
                .body(Map.of("username", username, "password", password))
                .when().post("/api/auth/login")
                .then().statusCode(200)
                .extract().path("token");
    }
}
