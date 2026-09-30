package com.redsocial.feed;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.hasKey;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.notNullValue;
import static org.hamcrest.Matchers.nullValue;
import static org.hamcrest.Matchers.startsWith;
import static org.junit.jupiter.api.Assertions.assertEquals;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import jakarta.inject.Inject;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.neo4j.driver.Driver;

import io.quarkus.test.junit.QuarkusTest;
import io.restassured.response.Response;
import io.smallrye.jwt.build.Jwt;

@QuarkusTest
class DiscoverResourceTest {
    @Inject Driver driver;
    private final List<String> ids = new ArrayList<>();

    @AfterEach
    void cleanup() {
        driver.executableQuery("MATCH (n) WHERE n.id IN $ids DETACH DELETE n")
                .withParameters(Map.of("ids", ids)).execute();
    }

    @Test
    void c7ExcludesOwnFollowedAndUnconnectedPostsAndProjectsPublicFields() {
        String viewer = user();
        String friend = user();
        String secondDegree = user();
        String outsider = user();
        String author = user();
        follow(viewer, friend);
        follow(friend, secondDegree);
        String expected = post(author, "2026-01-01T00:00:00Z");
        react(friend, expected);
        react(friend, post(viewer, "2026-01-02T00:00:00Z"));
        react(friend, post(friend, "2026-01-03T00:00:00Z"));
        react(outsider, post(author, "2026-01-04T00:00:00Z"));
        react(viewer, post(author, "2026-01-05T00:00:00Z"));
        react(secondDegree, post(author, "2026-01-06T00:00:00Z"));
        post(author, "2026-01-07T00:00:00Z");

        discover(viewer).then().statusCode(200)
                .body("id", contains(expected))
                .body("[0].autor.id", is(author)).body("[0].autor.username", is(author))
                .body("[0].autor.nombre", is("Discover test"))
                .body("[0].autor.size()", is(3)).body("[0].size()", is(8))
                .body("[0].texto", is("Hola"))
                .body("[0].fecha", startsWith("2026-01-01T00:00"))
                .body("[0].amigosQueReaccionaron", is(1))
                .body("[0].mediaKey", nullValue()).body("[0].mediaTipo", nullValue())
                .body("[0].mediaUrl", nullValue())
                .body(not(containsString("passwordHash"))).body(not(containsString("never-return-this")))
                .body(not(containsString("@test.invalid")));
    }

    @Test
    void countsDistinctFollowedUsersOncePerPostAndUsesJwtIdentity() {
        String viewer = user();
        String otherViewer = user();
        String first = user();
        String second = user();
        String outsider = user();
        follow(viewer, first);
        follow(viewer, second);
        follow(otherViewer, first);
        String post = post(user(), "2026-01-01T00:00:00Z");
        react(first, post);
        react(second, post);
        react(outsider, post);
        // Even duplicate paths in imported graph data must count a friend only once.
        driver.executableQuery("""
                        MATCH (u:Usuario {id:$user}), (p:Post {id:$post})
                        CREATE (u)-[:REACCIONA {tipo:'LIKE', fecha:datetime()}]->(p)
                        """).withParameters(Map.of("user", first, "post", post)).execute();

        given().auth().oauth2(Jwt.subject(viewer).sign()).queryParam("userId", otherViewer)
                .get("/api/descubrir").then().statusCode(200)
                .body("id", contains(post)).body("[0].amigosQueReaccionaron", is(2));
        discover(otherViewer).then().statusCode(200)
                .body("id", contains(post)).body("[0].amigosQueReaccionaron", is(1));
        discover(outsider).then().statusCode(200).body("size()", is(0));
    }

    @Test
    void ranksByFriendCountThenDateThenIdAndReturnsAtMostTen() {
        String viewer = user();
        String first = user();
        String second = user();
        String author = user();
        follow(viewer, first);
        follow(viewer, second);
        List<String> tied = new ArrayList<>();
        for (int i = 0; i < 12; i++) {
            String post = post(author, "2026-03-01T00:00:00Z");
            react(first, post);
            tied.add(post);
        }
        String olderPopular = post(author, "2026-01-01T00:00:00Z");
        String newerPopular = post(author, "2026-02-01T00:00:00Z");
        for (String post : List.of(olderPopular, newerPopular)) {
            react(first, post);
            react(second, post);
        }
        tied.sort(Comparator.reverseOrder());
        List<String> expected = new ArrayList<>(List.of(newerPopular, olderPopular));
        expected.addAll(tied.subList(0, 8));
        List<String> actual = discover(viewer).then().statusCode(200).body("size()", is(10))
                .body("[0].amigosQueReaccionaron", is(2)).body("[2].amigosQueReaccionaron", is(1))
                .extract().path("id");
        assertEquals(expected, actual);
    }

    @Test
    void followsAndReactionsThroughRestImmediatelyChangeDiscovery() {
        String viewer = user();
        String friend = user();
        String author = user();
        follow(viewer, friend);
        String post = given().auth().oauth2(Jwt.subject(author).sign()).multiPart("texto", "C7 desde REST")
                .post("/api/posts").then().statusCode(201).extract().path("id");
        ids.add(post);
        discover(viewer).then().statusCode(200).body("size()", is(0));
        react(friend, post);
        discover(viewer).then().body("id", contains(post));
        given().auth().oauth2(Jwt.subject(friend).sign()).delete("/api/posts/{id}/reacciones", post)
                .then().statusCode(204);
        discover(viewer).then().body("size()", is(0));
        react(friend, post);
        follow(viewer, author);
        discover(viewer).then().body("size()", is(0));
        unfollow(viewer, author);
        discover(viewer).then().body("id", contains(post));
        unfollow(viewer, friend);
        discover(viewer).then().body("size()", is(0));
    }

    @Test
    void emptyNetworksAndNetworksWithoutReactionsReturnEmptyArrays() {
        String viewer = user();
        discover(viewer).then().statusCode(200).body("size()", is(0));
        follow(viewer, user());
        discover(viewer).then().statusCode(200).body("size()", is(0));
    }

    @Test
    void mediaUrlMatchesThePostDetailContract() {
        String viewer = user();
        String friend = user();
        follow(viewer, friend);
        String post = post(user(), "2026-01-01T00:00:00Z");
        String key = "posts/" + post + "/image.png";
        driver.executableQuery("MATCH (p:Post {id:$post}) SET p.mediaKey=$key, p.mediaTipo='image/png'")
                .withParameters(Map.of("post", post, "key", key)).execute();
        react(friend, post);
        String url = given().auth().oauth2(Jwt.subject(viewer).sign()).get("/api/posts/{id}", post)
                .then().statusCode(200).extract().path("mediaUrl");
        discover(viewer).then().statusCode(200).body("[0].mediaKey", is(key))
                .body("[0].mediaTipo", is("image/png")).body("[0].mediaUrl", is(url));
    }

    @Test
    void requiresAuthenticationAndRejectsDeletedUsers() {
        given().get("/api/descubrir").then().statusCode(401).body("error", is("NO_AUTENTICADO"));
        given().auth().oauth2("invalid").get("/api/descubrir").then().statusCode(401);
        discover(UUID.randomUUID().toString()).then().statusCode(404)
                .body("error", is("USUARIO_NO_ENCONTRADO"));
    }

    @Test
    void swaggerDocumentsC7SecurityLimitAndProjectedResponse() {
        given().queryParam("format", "json").get("/api/openapi").then().statusCode(200)
                .body("paths.'/api/descubrir'.get.description", containsString("Consulta C7"))
                .body("paths.'/api/descubrir'.get.security[0]", hasKey("SecurityScheme"))
                .body("paths.'/api/descubrir'.get.responses.'200'.content.'application/json'.schema.type", is("array"))
                .body("paths.'/api/descubrir'.get.responses.'200'.content.'application/json'.schema.maxItems", is(10))
                .body("paths.'/api/descubrir'.get.responses.'200'.content.'application/json'.schema.items.'$ref'",
                        is("#/components/schemas/DiscoverResponse"))
                .body("paths.'/api/descubrir'.get.responses.'401'", notNullValue())
                .body("paths.'/api/descubrir'.get.responses.'404'", notNullValue())
                .body("components.schemas.DiscoverResponse.properties.amigosQueReaccionaron.type", is("integer"))
                .body("components.schemas.DiscoverResponse.properties.mediaUrl.type", is("string"));
    }

    private String user() {
        String id = UUID.randomUUID().toString();
        ids.add(id);
        driver.executableQuery("""
                        CREATE (:Usuario {id:$id, username:$id, email:$email, nombre:'Discover test',
                                          passwordHash:'never-return-this', bio:'', creadoEn:datetime()})
                        """).withParameters(Map.of("id", id, "email", id + "@test.invalid")).execute();
        return id;
    }

    private String post(String author, String date) {
        String id = UUID.randomUUID().toString();
        ids.add(id);
        driver.executableQuery("""
                        MATCH (u:Usuario {id:$author})
                        CREATE (u)-[:PUBLICA]->(:Post {id:$id, texto:'Hola', fecha:datetime($date)})
                        """).withParameters(Map.of("id", id, "author", author, "date", date)).execute();
        return id;
    }

    private static void follow(String viewer, String author) {
        given().auth().oauth2(Jwt.subject(viewer).sign()).post("/api/usuarios/{id}/seguir", author)
                .then().statusCode(204);
    }

    private static void unfollow(String viewer, String author) {
        given().auth().oauth2(Jwt.subject(viewer).sign()).delete("/api/usuarios/{id}/seguir", author)
                .then().statusCode(204);
    }

    private static void react(String viewer, String post) {
        given().auth().oauth2(Jwt.subject(viewer).sign()).post("/api/posts/{id}/reacciones", post)
                .then().statusCode(204);
    }

    private static Response discover(String viewer) {
        return given().auth().oauth2(Jwt.subject(viewer).sign()).get("/api/descubrir");
    }
}
