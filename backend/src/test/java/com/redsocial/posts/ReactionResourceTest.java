package com.redsocial.posts;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.hasKey;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.notNullValue;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

import java.time.ZonedDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import jakarta.inject.Inject;

import org.junit.jupiter.api.Test;
import org.neo4j.driver.Driver;
import org.neo4j.driver.Record;

import io.quarkus.test.junit.QuarkusTest;
import io.restassured.http.ContentType;
import io.restassured.response.Response;
import io.smallrye.jwt.build.Jwt;

@QuarkusTest
class ReactionResourceTest {
    @Inject Driver driver;

    @Test
    void reactCreatesOneLikeWithDate() {
        String user = createUser();
        String post = createPost(createUser());

        react(user, post).then().statusCode(204);

        List<Record> reactions = reactions(user, post);
        assertEquals(1, reactions.size());
        assertEquals("LIKE", reactions.getFirst().get("tipo").asString());
        assertNotNull(reactions.getFirst().get("fecha").asZonedDateTime());
    }

    @Test
    void reactingTwiceIsIdempotentAndKeepsTheOriginalDate() {
        String user = createUser();
        String post = createPost(createUser());

        react(user, post).then().statusCode(204);
        ZonedDateTime fecha = reactions(user, post).getFirst().get("fecha").asZonedDateTime();
        react(user, post).then().statusCode(204);

        List<Record> reactions = reactions(user, post);
        assertEquals(1, reactions.size());
        assertEquals(fecha, reactions.getFirst().get("fecha").asZonedDateTime());
    }

    @Test
    void eachUserHasItsOwnReaction() {
        String post = createPost(createUser());
        String ana = createUser();
        String beto = createUser();

        react(ana, post).then().statusCode(204);
        react(beto, post).then().statusCode(204);
        unreact(ana, post).then().statusCode(204);

        assertEquals(0, reactions(ana, post).size());
        assertEquals(1, reactions(beto, post).size());
    }

    @Test
    void unreactRemovesTheReaction() {
        String user = createUser();
        String post = createPost(createUser());
        react(user, post).then().statusCode(204);

        unreact(user, post).then().statusCode(204);

        assertEquals(0, reactions(user, post).size());
    }

    @Test
    void unreactWithoutReactionIsIdempotent() {
        String user = createUser();
        String post = createPost(createUser());

        unreact(user, post).then().statusCode(204);
        unreact(user, post).then().statusCode(204);
    }

    @Test
    void unknownPostReturns404() {
        String user = createUser();
        String unknown = UUID.randomUUID().toString();

        react(user, unknown).then().statusCode(404).contentType(ContentType.JSON)
                .body("error", is("POST_NO_ENCONTRADO"));
        unreact(user, unknown).then().statusCode(404).contentType(ContentType.JSON)
                .body("error", is("POST_NO_ENCONTRADO"));
    }

    @Test
    void reactWithTokenOfDeletedUserReturns404() {
        String post = createPost(createUser());

        react(UUID.randomUUID().toString(), post).then().statusCode(404)
                .body("error", is("USUARIO_NO_ENCONTRADO"));
    }

    @Test
    void everyEndpointRequiresToken() {
        String post = createPost(createUser());

        given().post("/api/posts/{id}/reacciones", post).then().statusCode(401)
                .body("error", is("NO_AUTENTICADO"));
        given().delete("/api/posts/{id}/reacciones", post).then().statusCode(401)
                .body("error", is("NO_AUTENTICADO"));
    }

    @Test
    void endpointsAreDocumentedInOpenApi() {
        given().queryParam("format", "json")
                .when().get("/api/openapi")
                .then()
                .statusCode(200)
                .body("paths.'/api/posts/{id}/reacciones'.post.summary", is("Reacciona a una publicación"))
                .body("paths.'/api/posts/{id}/reacciones'.post.tags", contains("Publicaciones"))
                .body("paths.'/api/posts/{id}/reacciones'.post.responses.'204'", notNullValue())
                .body("paths.'/api/posts/{id}/reacciones'.post.responses.'404'", notNullValue())
                .body("paths.'/api/posts/{id}/reacciones'.delete.responses.'204'", notNullValue())
                .body("paths.'/api/posts/{id}/reacciones'.delete.responses.'404'", notNullValue())
                .body("paths.'/api/posts/{id}/reacciones'.delete.security[0]", hasKey("SecurityScheme"));
    }

    private String createUser() {
        String id = UUID.randomUUID().toString();
        driver.executableQuery("""
                        CREATE (:Usuario {id:$id, username:$id, email:$email, nombre:'Test user',
                                          passwordHash:'never-return-this', bio:'', creadoEn:datetime()})
                        """).withParameters(Map.of("id", id, "email", id + "@test.invalid")).execute();
        return id;
    }

    private String createPost(String author) {
        String id = UUID.randomUUID().toString();
        driver.executableQuery("""
                        MATCH (u:Usuario {id:$author})
                        CREATE (u)-[:PUBLICA]->(:Post {id:$id, texto:'Hola', fecha:datetime()})
                        """).withParameters(Map.of("id", id, "author", author)).execute();
        return id;
    }

    private List<Record> reactions(String user, String post) {
        return driver.executableQuery("""
                        MATCH (:Usuario {id:$user})-[r:REACCIONA]->(:Post {id:$post})
                        RETURN r.tipo AS tipo, r.fecha AS fecha
                        """).withParameters(Map.of("user", user, "post", post)).execute().records();
    }

    private static Response react(String user, String post) {
        return given().auth().oauth2(Jwt.subject(user).sign()).post("/api/posts/{id}/reacciones", post);
    }

    private static Response unreact(String user, String post) {
        return given().auth().oauth2(Jwt.subject(user).sign()).delete("/api/posts/{id}/reacciones", post);
    }
}
