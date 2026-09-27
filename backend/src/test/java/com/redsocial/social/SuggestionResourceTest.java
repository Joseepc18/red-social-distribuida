package com.redsocial.social;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.containsInAnyOrder;
import static org.hamcrest.Matchers.empty;
import static org.hamcrest.Matchers.everyItem;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.notNullValue;
import static org.junit.jupiter.api.Assertions.assertEquals;

import java.util.List;
import java.util.Map;
import java.util.Set;

import jakarta.inject.Inject;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.neo4j.driver.Driver;

import io.quarkus.test.junit.QuarkusTest;
import io.restassured.http.ContentType;
import io.restassured.response.ValidatableResponse;

@QuarkusTest
class SuggestionResourceTest {

    @Inject
    Driver driver;

    TestUsers users;

    @BeforeEach
    void setUp() {
        users = new TestUsers(driver);
    }

    @Test
    void suggestsFriendsOfFriendsRankedByMutualsThenFollowers() {
        String p = TestUsers.uniquePrefix();
        String me = users.create(p + "me");
        String a = users.create(p + "a");
        String b = users.create(p + "b");
        String c = users.create(p + "c");
        String d = users.create(p + "d");
        String w = users.create(p + "w");
        String x = users.create(p + "x");
        String y = users.create(p + "y");
        String z = users.create(p + "z");
        for (String followed : List.of(a, b, c, d)) {
            follow(me, followed);
            follow(followed, w);
        }
        follow(a, x);
        follow(b, x);
        follow(a, y);
        follow(c, z);
        // z wins the tie with y on followers (3 vs 1).
        follow(users.create(), z);
        follow(users.create(), z);
        // Excluded: myself and users I already follow.
        follow(a, me);
        follow(a, b);

        suggestionsOf(me)
                .body("id", contains(w, x, z, y))
                .body("enComun", contains(4, 2, 1, 1))
                .body("seguidores", contains(4, 2, 3, 1))
                .body("[0].conexiones", hasSize(3))
                .body("[1].conexiones", containsInAnyOrder(p + "a", p + "b"))
                .body("[3].conexiones", contains(p + "a"))
                .body("[0].username", is(p + "w"))
                .body("[0].nombre", is("Nombre " + p + "w"));
    }

    @Test
    void returnsAtMostTenSuggestions() {
        String me = users.create();
        String friend = users.create();
        follow(me, friend);
        for (int i = 0; i < 12; i++) {
            follow(friend, users.create());
        }

        suggestionsOf(me).body("$", hasSize(10));
    }

    @Test
    void returnsEmptyListWhenFollowedUsersFollowNobodyNew() {
        String me = users.create();
        String friend = users.create();
        follow(me, friend);
        follow(friend, me);

        suggestionsOf(me).body("$", empty());
    }

    @Test
    void coldStartReturnsMostFollowedUsersWithSameShape() {
        String me = users.create();
        String popular = users.create();
        // More followers than any user created by other tests, so it ranks first.
        for (int i = 0; i < 20; i++) {
            follow(users.create(), popular);
        }

        suggestionsOf(me)
                .body("$", hasSize(10))
                .body("[0].id", is(popular))
                .body("[0].seguidores", is(20))
                .body("enComun", everyItem(is(0)))
                .body("conexiones", everyItem(empty()))
                .body("id", not(hasItem(me)));
    }

    @Test
    void suggestionsExposeOnlyProjectedFields() {
        String me = users.create();
        String friend = users.create();
        follow(me, friend);
        follow(friend, users.create());

        Map<String, Object> suggestion = suggestionsOf(me)
                .body("$", hasSize(1))
                .extract().jsonPath().getMap("[0]");

        assertEquals(Set.of("id", "username", "nombre", "enComun", "conexiones", "seguidores"),
                suggestion.keySet());
    }

    @Test
    void requiresToken() {
        given().when().get("/api/usuarios/me/sugerencias")
                .then()
                .statusCode(401)
                .body("error", is("NO_AUTENTICADO"));
    }

    @Test
    void endpointIsDocumentedInOpenApi() {
        given().queryParam("format", "json")
                .when().get("/api/openapi")
                .then()
                .statusCode(200)
                .body("paths.'/api/usuarios/me/sugerencias'.get.summary", is("Sugerencias de usuarios a seguir"))
                .body("paths.'/api/usuarios/me/sugerencias'.get.tags", contains("Social"))
                .body("paths.'/api/usuarios/me/sugerencias'.get.responses.'200'", notNullValue())
                .body("paths.'/api/usuarios/me/sugerencias'.get.responses.'401'", notNullValue());
    }

    private static ValidatableResponse suggestionsOf(String userId) {
        return given().auth().oauth2(TestUsers.tokenFor(userId))
                .when().get("/api/usuarios/me/sugerencias")
                .then()
                .statusCode(200)
                .contentType(ContentType.JSON);
    }

    private static void follow(String followerId, String followedId) {
        given().auth().oauth2(TestUsers.tokenFor(followerId))
                .when().post("/api/usuarios/{id}/seguir", followedId)
                .then().statusCode(204);
    }
}
