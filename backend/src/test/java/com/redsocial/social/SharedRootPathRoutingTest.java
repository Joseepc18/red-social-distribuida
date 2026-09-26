package com.redsocial.social;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.empty;
import static org.hamcrest.Matchers.is;

import jakarta.inject.Inject;

import org.junit.jupiter.api.Test;
import org.neo4j.driver.Driver;

import io.quarkus.test.junit.QuarkusTest;

/**
 * Two resource classes share {@code @Path("/usuarios")}: the profile resource
 * ({@code com.redsocial.usuarios.UserResource}, {@code GET {id}}) and
 * {@link FollowResource} ({@code {id}/seguidores}, ...).
 * Both sub-paths must reach their own class.
 */
@QuarkusTest
class SharedRootPathRoutingTest {

    @Inject
    Driver driver;

    @Test
    void profileAndFollowEndpointsCoexistUnderUsuarios() {
        String me = new TestUsers(driver).create();
        String token = TestUsers.tokenFor(me);

        given().auth().oauth2(token)
                .when().get("/api/usuarios/{id}", me)
                .then()
                .statusCode(200)
                .body("id", is(me));

        given().auth().oauth2(token)
                .when().get("/api/usuarios/{id}/seguidores", me)
                .then()
                .statusCode(200)
                .body("$", empty());

        given().auth().oauth2(token)
                .when().get("/api/usuarios/{id}/seguidos", me)
                .then()
                .statusCode(200)
                .body("$", empty());
    }
}
