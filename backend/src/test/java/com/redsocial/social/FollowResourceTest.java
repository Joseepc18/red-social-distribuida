package com.redsocial.social;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.empty;
import static org.hamcrest.Matchers.hasKey;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.notNullValue;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

import java.time.ZonedDateTime;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import jakarta.inject.Inject;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.neo4j.driver.Driver;
import org.neo4j.driver.Record;

import io.quarkus.test.junit.QuarkusTest;
import io.restassured.http.ContentType;
import io.restassured.response.Response;

@QuarkusTest
class FollowResourceTest {

    @Inject
    Driver driver;

    TestUsers users;

    @BeforeEach
    void setUp() {
        users = new TestUsers(driver);
    }

    @Test
    void followCreatesOneRelationshipWithDesde() {
        String me = users.create();
        String other = users.create();

        follow(me, other).then().statusCode(204);

        List<Record> rels = followRelationships(me, other);
        assertEquals(1, rels.size());
        assertNotNull(rels.get(0).get("desde").asZonedDateTime());
    }

    @Test
    void followingTwiceIsIdempotent() {
        String me = users.create();
        String other = users.create();

        follow(me, other).then().statusCode(204);
        ZonedDateTime desde = followRelationships(me, other).get(0).get("desde").asZonedDateTime();
        follow(me, other).then().statusCode(204);

        List<Record> rels = followRelationships(me, other);
        assertEquals(1, rels.size());
        assertEquals(desde, rels.get(0).get("desde").asZonedDateTime());
    }

    @Test
    void followingYourselfReturns400() {
        String me = users.create();

        follow(me, me).then()
                .statusCode(400)
                .contentType(ContentType.JSON)
                .body("error", is("NO_PUEDE_SEGUIRSE"));

        assertEquals(0, followRelationships(me, me).size());
    }

    @Test
    void followingUnknownUserReturns404() {
        String me = users.create();

        follow(me, UUID.randomUUID().toString()).then()
                .statusCode(404)
                .contentType(ContentType.JSON)
                .body("error", is("USUARIO_NO_ENCONTRADO"));
    }

    @Test
    void followingWithTokenOfDeletedUserReturns404() {
        String ghost = UUID.randomUUID().toString();
        String other = users.create();

        follow(ghost, other).then()
                .statusCode(404)
                .body("error", is("USUARIO_NO_ENCONTRADO"));
    }

    @Test
    void unfollowRemovesTheRelationship() {
        String me = users.create();
        String other = users.create();
        follow(me, other).then().statusCode(204);

        unfollow(me, other).then().statusCode(204);

        assertEquals(0, followRelationships(me, other).size());
    }

    @Test
    void unfollowWithoutRelationshipIsIdempotent() {
        String me = users.create();
        String other = users.create();

        unfollow(me, other).then().statusCode(204);
        unfollow(me, other).then().statusCode(204);
    }

    @Test
    void unfollowUnknownUserReturns204() {
        String me = users.create();

        unfollow(me, UUID.randomUUID().toString()).then().statusCode(204);
    }

    @Test
    void followersAreListedByUsername() {
        String prefix = TestUsers.uniquePrefix();
        String target = users.create(prefix + "target");
        String carla = users.create(prefix + "carla");
        String ana = users.create(prefix + "ana");
        String beto = users.create(prefix + "beto");
        for (String follower : List.of(carla, ana, beto)) {
            follow(follower, target).then().statusCode(204);
        }

        given().auth().oauth2(TestUsers.tokenFor(ana))
                .when().get("/api/usuarios/{id}/seguidores", target)
                .then()
                .statusCode(200)
                .contentType(ContentType.JSON)
                .body("username", contains(prefix + "ana", prefix + "beto", prefix + "carla"))
                .body("id", contains(ana, beto, carla))
                .body("nombre", contains("Nombre " + prefix + "ana", "Nombre " + prefix + "beto",
                        "Nombre " + prefix + "carla"));
    }

    @Test
    void followedAreListedByUsername() {
        String prefix = TestUsers.uniquePrefix();
        String me = users.create(prefix + "me");
        String zoe = users.create(prefix + "zoe");
        String luis = users.create(prefix + "luis");
        follow(me, zoe).then().statusCode(204);
        follow(me, luis).then().statusCode(204);
        // Reverse direction must not show up in "seguidos".
        follow(users.create(prefix + "fan"), me).then().statusCode(204);

        given().auth().oauth2(TestUsers.tokenFor(me))
                .when().get("/api/usuarios/{id}/seguidos", me)
                .then()
                .statusCode(200)
                .body("id", contains(luis, zoe));
    }

    @Test
    void listsAreEmptyForUserWithoutRelationships() {
        String me = users.create();
        String token = TestUsers.tokenFor(me);

        given().auth().oauth2(token).when().get("/api/usuarios/{id}/seguidores", me)
                .then().statusCode(200).body("$", empty());
        given().auth().oauth2(token).when().get("/api/usuarios/{id}/seguidos", me)
                .then().statusCode(200).body("$", empty());
    }

    @Test
    void listsOfUnknownUserAreEmpty() {
        String token = TestUsers.tokenFor(users.create());
        String unknown = UUID.randomUUID().toString();

        for (String list : List.of("seguidores", "seguidos")) {
            given().auth().oauth2(token)
                    .when().get("/api/usuarios/{id}/" + list, unknown)
                    .then()
                    .statusCode(200)
                    .body("$", empty());
        }
    }

    @Test
    void listsExposeOnlyPublicFields() {
        String me = users.create();
        String other = users.create();
        follow(me, other).then().statusCode(204);

        Map<String, Object> follower = given().auth().oauth2(TestUsers.tokenFor(me))
                .when().get("/api/usuarios/{id}/seguidores", other)
                .then()
                .statusCode(200)
                .body("$", hasSize(1))
                .extract().jsonPath().getMap("[0]");

        assertEquals(Set.of("id", "username", "nombre"), follower.keySet());
    }

    @Test
    void everyEndpointRequiresToken() {
        String id = users.create();

        given().when().post("/api/usuarios/{id}/seguir", id).then().statusCode(401)
                .body("error", is("NO_AUTENTICADO"));
        given().when().delete("/api/usuarios/{id}/seguir", id).then().statusCode(401)
                .body("error", is("NO_AUTENTICADO"));
        given().when().get("/api/usuarios/{id}/seguidores", id).then().statusCode(401)
                .body("error", is("NO_AUTENTICADO"));
        given().when().get("/api/usuarios/{id}/seguidos", id).then().statusCode(401)
                .body("error", is("NO_AUTENTICADO"));
    }

    @Test
    void endpointsAreDocumentedInOpenApi() {
        given().queryParam("format", "json")
                .when().get("/api/openapi")
                .then()
                .statusCode(200)
                .body("paths.'/api/usuarios/{id}/seguir'.post.responses.'204'", notNullValue())
                .body("paths.'/api/usuarios/{id}/seguir'.post.responses.'400'", notNullValue())
                .body("paths.'/api/usuarios/{id}/seguir'.delete.summary", is("Dejar de seguir a un usuario"))
                .body("paths.'/api/usuarios/{id}/seguir'.post.responses.'404'", notNullValue())
                .body("paths.'/api/usuarios/{id}/seguidores'.get.tags", contains("Social"))
                .body("paths.'/api/usuarios/{id}/seguidos'.get.responses.'200'", notNullValue())
                .body("paths.'/api/usuarios/{id}/seguir'.delete.security[0]", hasKey("SecurityScheme"))
                .body("paths.'/api/usuarios/{id}/seguidores'.get.security[0]", hasKey("SecurityScheme"));
    }

    private static Response follow(String callerId, String targetId) {
        return given().auth().oauth2(TestUsers.tokenFor(callerId))
                .when().post("/api/usuarios/{id}/seguir", targetId);
    }

    private static Response unfollow(String callerId, String targetId) {
        return given().auth().oauth2(TestUsers.tokenFor(callerId))
                .when().delete("/api/usuarios/{id}/seguir", targetId);
    }

    private List<Record> followRelationships(String fromId, String toId) {
        return driver.executableQuery("""
                        MATCH (:Usuario {id: $from})-[r:SIGUE]->(:Usuario {id: $to})
                        RETURN r.desde AS desde
                        """)
                .withParameters(Map.of("from", fromId, "to", toId))
                .execute()
                .records();
    }
}
