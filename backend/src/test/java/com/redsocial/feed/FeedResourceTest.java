package com.redsocial.feed;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.everyItem;
import static org.hamcrest.Matchers.hasKey;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.not;
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
class FeedResourceTest {
    @Inject Driver driver;
    private final List<String> ids = new ArrayList<>();

    @AfterEach
    void cleanup() {
        driver.executableQuery("MATCH (n) WHERE n.id IN $ids DETACH DELETE n")
                .withParameters(Map.of("ids", ids)).execute();
    }

    @Test
    void feedFollowsTheDirectedTwoHopPathAndUsesJwtIdentity() {
        String viewer = user();
        String author = user();
        String secondDegree = user();
        String unrelated = user();
        follow(viewer, author);
        follow(author, secondDegree);
        follow(unrelated, viewer);
        String expected = post(author, "2026-01-01T00:00:00Z");
        post(viewer, "2026-01-02T00:00:00Z");
        post(secondDegree, "2026-01-03T00:00:00Z");
        post(unrelated, "2026-01-04T00:00:00Z");

        given().auth().oauth2(Jwt.subject(viewer).sign()).queryParam("userId", unrelated)
                .get("/api/feed").then().statusCode(200)
                .body("id", contains(expected))
                .body("[0].autor.id", is(author))
                .body("[0].autor.username", is(author))
                .body("[0].autor.nombre", is("Feed test"))
                .body("[0].autor.size()", is(3))
                .body("[0].texto", is("Hola"))
                .body("[0].fecha", startsWith("2026-01-01T00:00"))
                .body("[0].reacciones", is(0)).body("[0].reaccionado", is(false))
                .body("[0].mediaKey", nullValue()).body("[0].mediaTipo", nullValue())
                .body("[0].mediaUrl", nullValue())
                .body(not(containsString("never-return-this")))
                .body(not(containsString("passwordHash"))).body(not(containsString("@test.invalid")));
        feed(unrelated, 0).then().body("autor.id", everyItem(is(viewer)));

        given().auth().oauth2(Jwt.subject(viewer).sign())
                .delete("/api/usuarios/{id}/seguir", author).then().statusCode(204);
        feed(viewer, 0).then().body("size()", is(0));
    }

    @Test
    void reactionsUseTheExistingEndpointsAndArePersonalized() {
        String ana = user();
        String beto = user();
        String author = user();
        follow(ana, author);
        follow(beto, author);
        String post = given().auth().oauth2(Jwt.subject(author).sign())
                .multiPart("texto", "Publicación creada por REST").post("/api/posts")
                .then().statusCode(201).extract().path("id");
        ids.add(post);
        react(ana, post);
        react(author, post);
        feed(ana, 0).then().body("[0].reacciones", is(2)).body("[0].reaccionado", is(true));
        feed(beto, 0).then().body("[0].reacciones", is(2)).body("[0].reaccionado", is(false));
        given().auth().oauth2(Jwt.subject(ana).sign()).delete("/api/posts/{id}/reacciones", post)
                .then().statusCode(204);
        feed(ana, 0).then().body("[0].reacciones", is(1)).body("[0].reaccionado", is(false));
    }

    @Test
    void datesAndTiedIdsAreDescendingAcrossPages() {
        String viewer = user();
        String author = user();
        follow(viewer, author);
        List<String> tied = new ArrayList<>();
        for (int i = 0; i < 21; i++) {
            tied.add(post(author, "2026-01-02T00:00:00Z"));
        }
        tied.sort(Comparator.reverseOrder());
        String oldest = post(author, "2026-01-01T00:00:00Z");
        String newest = post(author, "2026-01-03T00:00:00Z");
        List<String> expected = new ArrayList<>();
        expected.add(newest);
        expected.addAll(tied);
        expected.add(oldest);
        List<String> page0 = feed(viewer, 0).then().statusCode(200).extract().path("id");
        List<String> page1 = feed(viewer, 1).then().statusCode(200).extract().path("id");
        assertEquals(expected.subList(0, 20), page0);
        assertEquals(expected.subList(20, 23), page1);
        feed(viewer, 2).then().statusCode(200).body("size()", is(0));
        feed(viewer, Integer.MAX_VALUE).then().statusCode(200).body("size()", is(0));
    }

    @Test
    void emptyNetworksAndAuthorsWithoutPostsReturnEmptyArrays() {
        String viewer = user();
        feed(viewer, 0).then().statusCode(200).body("size()", is(0));
        follow(viewer, user());
        feed(viewer, 0).then().statusCode(200).body("size()", is(0));
    }

    @Test
    void mediaUsesTheSamePublicUrlAsPostDetail() {
        String viewer = user();
        String author = user();
        follow(viewer, author);
        String post = post(author, "2026-01-01T00:00:00Z");
        String key = "posts/" + post + "/image.png";
        driver.executableQuery("MATCH (p:Post {id:$id}) SET p.mediaKey=$key, p.mediaTipo='image/png'")
                .withParameters(Map.of("id", post, "key", key)).execute();
        String url = given().auth().oauth2(Jwt.subject(viewer).sign()).get("/api/posts/{id}", post)
                .then().statusCode(200).extract().path("mediaUrl");
        feed(viewer, 0).then().statusCode(200).body("[0].mediaKey", is(key))
                .body("[0].mediaTipo", is("image/png")).body("[0].mediaUrl", is(url));
    }

    @Test
    void authenticationAndInvalidPagesAreRejected() {
        given().get("/api/feed").then().statusCode(401);
        given().auth().oauth2("invalid").get("/api/feed").then().statusCode(401);
        String viewer = user();
        feed(viewer, -1).then().statusCode(400).body("error", is("VALIDACION"));
        given().auth().oauth2(Jwt.subject(viewer).sign()).queryParam("page", "abc")
                .get("/api/feed").then().statusCode(404);
        feed(UUID.randomUUID().toString(), 0).then().statusCode(404)
                .body("error", is("USUARIO_NO_ENCONTRADO"));
    }

    @Test
    void openApiPublishesThePaginationAndResponseContract() {
        given().queryParam("format", "json").get("/api/openapi").then().statusCode(200)
                .body("paths.'/api/feed'.get.summary", is("Feed personalizado de usuarios seguidos"))
                .body("paths.'/api/feed'.get.security[0]", hasKey("SecurityScheme"))
                .body("paths.'/api/feed'.get.parameters.find { it.name == 'page' }.schema.default", is(0))
                .body("paths.'/api/feed'.get.responses.'200'.content.'application/json'.schema.type", is("array"))
                .body("paths.'/api/feed'.get.responses.'200'.content.'application/json'.schema.items.'$ref'",
                        is("#/components/schemas/PostResponse"))
                .body("components.schemas.PostResponse.properties.reacciones.type", is("integer"))
                .body("components.schemas.PostResponse.properties.reaccionado.type", is("boolean"))
                .body("components.schemas.PostResponse.properties.comentarios.type", is("integer"));
    }

    private String user() {
        String id = UUID.randomUUID().toString();
        ids.add(id);
        driver.executableQuery("""
                        CREATE (:Usuario {id:$id, username:$id, email:$email, nombre:'Feed test',
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

    private static void react(String viewer, String post) {
        given().auth().oauth2(Jwt.subject(viewer).sign()).post("/api/posts/{id}/reacciones", post)
                .then().statusCode(204);
    }

    private static Response feed(String viewer, int page) {
        return given().auth().oauth2(Jwt.subject(viewer).sign()).queryParam("page", page).get("/api/feed");
    }
}
