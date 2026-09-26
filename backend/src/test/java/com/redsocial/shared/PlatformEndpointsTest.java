package com.redsocial.shared;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.notNullValue;

import org.junit.jupiter.api.Test;

import io.quarkus.test.junit.QuarkusTest;

@QuarkusTest
class PlatformEndpointsTest {

    @Test
    void healthIsUpIncludingNeo4j() {
        given()
                .when().get("/q/health")
                .then()
                .log().ifValidationFails()
                .statusCode(200)
                .body("status", is("UP"))
                .body("checks.name", hasItem("Neo4j connection health check"));
    }

    @Test
    void swaggerUiIsServedUnderApiDocs() {
        given()
                .when().get("/api/docs/")
                .then()
                .statusCode(200);
    }

    @Test
    void openApiDeclaresBearerJwtScheme() {
        given()
                .queryParam("format", "json")
                .when().get("/api/openapi")
                .then()
                .statusCode(200)
                .body("components.securitySchemes.SecurityScheme.scheme", is("bearer"))
                .body("paths.'/api/info'", notNullValue());
    }
}
