package com.redsocial.shared.info;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.is;

import org.junit.jupiter.api.Test;

import io.quarkus.test.junit.QuarkusTest;

@QuarkusTest
class InfoResourceTest {

    @Test
    void returnsInstanceIdWithoutToken() {
        given()
                .when().get("/api/info")
                .then()
                .statusCode(200)
                .body("instancia", is("local"));
    }
}
