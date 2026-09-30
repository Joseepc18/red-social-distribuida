package com.redsocial.shared;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.is;

import org.junit.jupiter.api.Test;

import io.quarkus.test.junit.QuarkusTest;
import io.restassured.http.ContentType;
import io.smallrye.jwt.build.Jwt;

@QuarkusTest
class SecurityTest {

    @Test
    void protectedEndpointWithoutTokenReturns401() {
        given()
                .when().get("/api/test-only/protected")
                .then()
                .statusCode(401)
                .contentType(ContentType.JSON)
                .header("WWW-Authenticate", "Bearer")
                .body("error", is("NO_AUTENTICADO"));
    }

    @Test
    void invalidTokenReturns401() {
        given()
                .auth().oauth2("not-a-jwt")
                .when().get("/api/test-only/protected")
                .then()
                .statusCode(401)
                .contentType(ContentType.JSON)
                .body("error", is("NO_AUTENTICADO"));
    }

    @Test
    void validTokenExposesSubject() {
        // In test mode smallrye-jwt generates the key pair, so Jwt...sign() works without key files.
        String token = Jwt.subject("user-123").sign();

        given()
                .auth().oauth2(token)
                .when().get("/api/test-only/protected")
                .then()
                .statusCode(200)
                .body(is("user-123"));
    }

    @Test
    void missingRoleReturns403() {
        String token = Jwt.subject("user-123").sign();

        given()
                .auth().oauth2(token)
                .when().get("/api/test-only/admin")
                .then()
                .statusCode(403)
                .contentType(ContentType.JSON)
                .body("error", is("PROHIBIDO"));
    }
}
