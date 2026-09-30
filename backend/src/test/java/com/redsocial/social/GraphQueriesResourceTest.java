package com.redsocial.social;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.empty;
import static org.hamcrest.Matchers.hasKey;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.notNullValue;
import static org.hamcrest.Matchers.nullValue;
import static org.junit.jupiter.api.Assertions.assertEquals;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import jakarta.inject.Inject;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.neo4j.driver.Driver;

import io.quarkus.test.junit.QuarkusTest;
import io.restassured.http.ContentType;
import io.restassured.response.Response;

/** Mutual follows (C3), reachability (C4) and degrees of separation (C5). */
@QuarkusTest
class GraphQueriesResourceTest {

    @Inject
    Driver driver;

    TestUsers users;

    @BeforeEach
    void setUp() {
        users = new TestUsers(driver);
    }

    @Test
    void mutualsAreUsersFollowedByBothOrderedByUsername() {
        String p = TestUsers.uniquePrefix();
        String me = users.create(p + "me");
        String other = users.create(p + "other");
        String carla = users.create(p + "carla");
        String ana = users.create(p + "ana");
        String beto = users.create(p + "beto");
        String dani = users.create(p + "dani");
        follow(me, carla);
        follow(me, ana);
        follow(me, beto);
        follow(other, ana);
        follow(other, carla);
        follow(other, dani);
        // Reverse direction is not "followed by both".
        follow(beto, other);

        get(me, "/api/usuarios/{id}/en-comun", other).then()
                .statusCode(200)
                .contentType(ContentType.JSON)
                .body("id", contains(ana, carla))
                .body("username", contains(p + "ana", p + "carla"))
                .body("nombre", contains("Nombre " + p + "ana", "Nombre " + p + "carla"));
    }

    @Test
    void mutualsAreEmptyWithoutCommonFollows() {
        String me = users.create();
        String other = users.create();
        follow(me, users.create());

        get(me, "/api/usuarios/{id}/en-comun", other).then()
                .statusCode(200)
                .body("$", empty());
    }

    @Test
    void mutualsExposeOnlyProjectedFields() {
        String me = users.create();
        String other = users.create();
        String common = users.create();
        follow(me, common);
        follow(other, common);

        Map<String, Object> user = get(me, "/api/usuarios/{id}/en-comun", other).then()
                .statusCode(200)
                .extract().jsonPath().getMap("[0]");

        assertEquals(Set.of("id", "username", "nombre"), user.keySet());
    }

    @Test
    void reachListsUsersUpToThreeLevelsWithMinimumDistance() {
        String p = TestUsers.uniquePrefix();
        String me = users.create(p + "me");
        String a = users.create(p + "a");
        String b = users.create(p + "b");
        String c = users.create(p + "c");
        String d = users.create(p + "d");
        String e = users.create(p + "e");
        follow(me, a);
        follow(a, b);
        follow(b, c);
        // Fourth level: out of reach.
        follow(c, d);
        // Second path to b, same length: b appears once with distance 2.
        follow(me, e);
        follow(e, b);
        // Cycle back to me: never listed.
        follow(b, me);

        get(me, "/api/usuarios/me/alcance").then()
                .statusCode(200)
                .contentType(ContentType.JSON)
                .body("id", contains(a, e, b, c))
                .body("distancia", contains(1, 1, 2, 3))
                .body("username", contains(p + "a", p + "e", p + "b", p + "c"));
    }

    @Test
    void reachUsesTheShortestDistance() {
        String me = users.create();
        String a = users.create();
        String b = users.create();
        follow(me, a);
        follow(a, b);
        follow(me, b);

        get(me, "/api/usuarios/me/alcance").then()
                .statusCode(200)
                .body("distancia", contains(1, 1));
    }

    @Test
    void reachExposesOnlyProjectedFields() {
        String me = users.create();
        follow(me, users.create());

        Map<String, Object> user = get(me, "/api/usuarios/me/alcance").then()
                .statusCode(200)
                .extract().jsonPath().getMap("[0]");

        assertEquals(Set.of("id", "username", "nombre", "distancia"), user.keySet());
    }

    @Test
    void reachIsEmptyForUserThatFollowsNobody() {
        String me = users.create();
        follow(users.create(), me);

        get(me, "/api/usuarios/me/alcance").then()
                .statusCode(200)
                .body("$", empty());
    }

    @Test
    void separationFollowsTheShortestPathIgnoringDirection() {
        String p = TestUsers.uniquePrefix();
        String me = users.create(p + "me");
        String a = users.create(p + "a");
        String b = users.create(p + "b");
        String target = users.create(p + "target");
        follow(me, a);
        follow(b, a);
        follow(target, b);

        get(me, "/api/usuarios/{id}/separacion", target).then()
                .statusCode(200)
                .contentType(ContentType.JSON)
                .body("grados", is(3))
                .body("cadena", contains(p + "me", p + "a", p + "b", p + "target"));
    }

    @Test
    void separationWithoutPathReturnsNullDegreesAndEmptyChain() {
        String me = users.create();
        String stranger = users.create();

        get(me, "/api/usuarios/{id}/separacion", stranger).then()
                .statusCode(200)
                .body("$", hasKey("grados"))
                .body("grados", nullValue())
                .body("cadena", empty());
    }

    @Test
    void separationBeyondSixHopsHasNoPath() {
        List<String> chain = new ArrayList<>();
        for (int i = 0; i < 8; i++) {
            chain.add(users.create());
        }
        for (int i = 0; i < chain.size() - 1; i++) {
            follow(chain.get(i), chain.get(i + 1));
        }

        get(chain.get(0), "/api/usuarios/{id}/separacion", chain.get(6)).then()
                .statusCode(200)
                .body("grados", is(6));
        get(chain.get(0), "/api/usuarios/{id}/separacion", chain.get(7)).then()
                .statusCode(200)
                .body("grados", nullValue())
                .body("cadena", empty());
    }

    @Test
    void separationWithYourselfReturns400() {
        String me = users.create();

        get(me, "/api/usuarios/{id}/separacion", me).then()
                .statusCode(400)
                .contentType(ContentType.JSON)
                .body("error", is("MISMO_USUARIO"));
    }

    @Test
    void unknownUserReturns404() {
        String me = users.create();
        String unknown = UUID.randomUUID().toString();

        for (String path : List.of("/api/usuarios/{id}/en-comun", "/api/usuarios/{id}/separacion")) {
            get(me, path, unknown).then()
                    .statusCode(404)
                    .contentType(ContentType.JSON)
                    .body("error", is("USUARIO_NO_ENCONTRADO"));
        }
    }

    @Test
    void everyEndpointRequiresToken() {
        String id = users.create();

        given().when().get("/api/usuarios/{id}/en-comun", id).then().statusCode(401)
                .body("error", is("NO_AUTENTICADO"));
        given().when().get("/api/usuarios/me/alcance").then().statusCode(401)
                .body("error", is("NO_AUTENTICADO"));
        given().when().get("/api/usuarios/{id}/separacion", id).then().statusCode(401)
                .body("error", is("NO_AUTENTICADO"));
    }

    @Test
    void endpointsAreDocumentedInOpenApi() {
        given().queryParam("format", "json")
                .when().get("/api/openapi")
                .then()
                .statusCode(200)
                .body("paths.'/api/usuarios/{id}/en-comun'.get.tags", contains("Social"))
                .body("paths.'/api/usuarios/{id}/en-comun'.get.responses.'404'", notNullValue())
                .body("paths.'/api/usuarios/me/alcance'.get.summary", is("Usuarios alcanzables"))
                .body("paths.'/api/usuarios/me/alcance'.get.responses.'200'", notNullValue())
                .body("paths.'/api/usuarios/{id}/separacion'.get.responses.'400'", notNullValue())
                .body("paths.'/api/usuarios/{id}/separacion'.get.responses.'404'", notNullValue())
                .body("paths.'/api/usuarios/{id}/separacion'.get.security[0]", hasKey("SecurityScheme"));
    }

    private static Response get(String callerId, String path, Object... params) {
        return given().auth().oauth2(TestUsers.tokenFor(callerId))
                .when().get(path, params);
    }

    private static void follow(String followerId, String followedId) {
        given().auth().oauth2(TestUsers.tokenFor(followerId))
                .when().post("/api/usuarios/{id}/seguir", followedId)
                .then().statusCode(204);
    }
}
