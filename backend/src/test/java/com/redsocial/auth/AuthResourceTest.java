package com.redsocial.auth;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.allOf;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.notNullValue;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.Base64;
import java.util.Map;

import jakarta.inject.Inject;

import org.junit.jupiter.api.Test;
import org.neo4j.driver.Driver;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import io.quarkus.test.junit.QuarkusTest;
import io.restassured.http.ContentType;

@QuarkusTest
class AuthResourceTest {

    @Inject
    Driver driver;

    @Inject
    ObjectMapper mapper;

    @Test
    void registerReturns201WithProfileAndNoPassword() {
        String username = TestUsers.randomUsername();

        String id = given()
                .contentType(ContentType.JSON)
                .body(TestUsers.registration(username, username + "@test.com"))
                .when().post("/api/auth/registro")
                .then()
                .statusCode(201)
                .contentType(ContentType.JSON)
                .body("id", notNullValue())
                .body("username", is(username))
                .body("nombre", is("Nombre " + username))
                .body("bio", is(""))
                .body(allOf(not(containsString("passwordHash")), not(containsString("password")),
                        not(containsString(TestUsers.PASSWORD))))
                .extract().path("id");

        assertTrue(id.matches("[0-9a-f-]{36}"), "id must be a UUID: " + id);
    }

    @Test
    void passwordIsStoredAsBcryptHash() {
        String username = TestUsers.randomUsername();
        register(username, username + "@test.com").then().statusCode(201);

        String hash = driver.executableQuery("MATCH (u:Usuario {username: $username}) RETURN u.passwordHash AS h")
                .withParameters(Map.of("username", username))
                .execute().records().getFirst().get("h").asString();

        assertNotEquals(TestUsers.PASSWORD, hash);
        assertTrue(hash.startsWith("$2"), "expected a BCrypt hash in Modular Crypt Format: " + hash);
    }

    @Test
    void duplicateUsernameReturns409() {
        String username = TestUsers.randomUsername();
        register(username, username + "@test.com").then().statusCode(201);

        register(username, "otro_" + username + "@test.com")
                .then()
                .statusCode(409)
                .contentType(ContentType.JSON)
                .body("error", is("USERNAME_EN_USO"));
    }

    @Test
    void duplicateEmailReturns409() {
        String username = TestUsers.randomUsername();
        register(username, username + "@test.com").then().statusCode(201);

        register(TestUsers.randomUsername(), username + "@test.com")
                .then()
                .statusCode(409)
                .contentType(ContentType.JSON)
                .body("error", is("EMAIL_EN_USO"));
    }

    @Test
    void blankRegistrationFieldsReturn400WithEveryField() {
        given()
                .contentType(ContentType.JSON)
                .body(Map.of("username", "", "email", " ", "password", "", "nombre", ""))
                .when().post("/api/auth/registro")
                .then()
                .statusCode(400)
                .body("error", is("VALIDACION"))
                .body("mensaje", allOf(containsString("username"), containsString("email"),
                        containsString("password"), containsString("nombre")));
    }

    @Test
    void registrationWithoutBodyReturns400() {
        given()
                .contentType(ContentType.JSON)
                .when().post("/api/auth/registro")
                .then()
                .statusCode(400)
                .body("error", is("VALIDACION"));
    }

    @Test
    void loginReturnsTokenThatOpensProtectedEndpoints() {
        String username = TestUsers.randomUsername();
        String id = register(username, username + "@test.com").then().statusCode(201).extract().path("id");

        String token = given()
                .contentType(ContentType.JSON)
                .body(Map.of("username", username, "password", TestUsers.PASSWORD))
                .when().post("/api/auth/login")
                .then()
                .statusCode(200)
                .body("token", notNullValue())
                .body(not(containsString("passwordHash")))
                .extract().path("token");

        given()
                .auth().oauth2(token)
                .when().get("/api/usuarios/me")
                .then()
                .statusCode(200)
                .body("id", is(id));
    }

    @Test
    void tokenHasSubjectIssuerAndLasts24Hours() throws Exception {
        TestUsers.TestUser user = TestUsers.create();

        JsonNode claims = mapper.readTree(Base64.getUrlDecoder()
                .decode(user.token().split("\\.")[1]));

        assertEquals(user.id(), claims.get("sub").asText());
        assertEquals(user.username(), claims.get("upn").asText());
        assertEquals("red-social", claims.get("iss").asText());
        assertEquals(24 * 60 * 60, claims.get("exp").asLong() - claims.get("iat").asLong());
    }

    @Test
    void wrongPasswordAndUnknownUserReturn401() {
        TestUsers.TestUser user = TestUsers.create();

        String wrongPassword = loginBody(user.username(), "otra-clave-999");
        String unknownUser = loginBody(TestUsers.randomUsername(), TestUsers.PASSWORD);

        assertTrue(wrongPassword.contains("CREDENCIALES_INVALIDAS"), wrongPassword);
        assertTrue(unknownUser.contains("CREDENCIALES_INVALIDAS"), unknownUser);
    }

    @Test
    void loginWithoutFieldsReturns400() {
        given()
                .contentType(ContentType.JSON)
                .body(Map.of("username", ""))
                .when().post("/api/auth/login")
                .then()
                .statusCode(400)
                .body("error", is("VALIDACION"));
    }

    private static io.restassured.response.Response register(String username, String email) {
        return given()
                .contentType(ContentType.JSON)
                .body(TestUsers.registration(username, email))
                .when().post("/api/auth/registro");
    }

    private static String loginBody(String username, String password) {
        return given()
                .contentType(ContentType.JSON)
                .body(Map.of("username", username, "password", password))
                .when().post("/api/auth/login")
                .then()
                .statusCode(401)
                .contentType(ContentType.JSON)
                .extract().asString();
    }
}
