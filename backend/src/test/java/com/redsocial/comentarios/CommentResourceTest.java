package com.redsocial.comentarios;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.hasKey;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.notNullValue;
import static org.hamcrest.Matchers.nullValue;
import static org.junit.jupiter.api.Assertions.assertEquals;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import jakarta.inject.Inject;

import org.junit.jupiter.api.Test;
import org.neo4j.driver.Driver;

import io.quarkus.test.junit.QuarkusTest;
import io.restassured.http.ContentType;
import io.restassured.response.Response;
import io.smallrye.jwt.build.Jwt;

@QuarkusTest
class CommentResourceTest {
    @Inject Driver driver;

    @Test
    void commentCreatesTheNodeAndReturnsIt() {
        String user = createUser();
        String post = createPost(createUser());

        comment(user, post, "  Buen avance  ", null).then().statusCode(201).contentType(ContentType.JSON)
                .body("id", notNullValue())
                .body("texto", is("Buen avance"))
                .body("fecha", notNullValue())
                .body("autor.id", is(user))
                .body("autor.username", is(user))
                .body("autor.nombre", is("Test user"))
                .body("autor", not(hasKey("passwordHash")))
                .body("respondeA", nullValue())
                .body("respuestas", is(0));

        assertEquals(1L, count("""
                MATCH (:Usuario {id: $user})-[:COMENTA]->(:Comentario {texto: 'Buen avance'})-[:EN]->(:Post {id: $post})
                RETURN count(*) AS total
                """, Map.of("user", user, "post", post)));
    }

    @Test
    void replyPointsToItsParentAndNotToThePost() {
        String user = createUser();
        String post = createPost(createUser());
        String parent = commentId(user, post, "Comentario", null);

        comment(user, post, "Respuesta", parent).then().statusCode(201)
                .body("respondeA", is(parent))
                .body("respuestas", is(0));

        assertEquals(1L, count("""
                MATCH (:Comentario {texto: 'Respuesta'})-[:RESPONDE_A]->(:Comentario {id: $parent})
                RETURN count(*) AS total
                """, Map.of("parent", parent)));
        assertEquals(0L, count("""
                MATCH (:Comentario {texto: 'Respuesta'})-[:EN]->(:Post) RETURN count(*) AS total
                """, Map.of()));
    }

    @Test
    void threadReturnsEveryLevelOrderedByDate() {
        String ana = createUser();
        String beto = createUser();
        String post = createPost(createUser());
        String first = commentId(ana, post, "Primero", null);
        String reply = commentId(beto, post, "Respuesta", first);
        String nested = commentId(ana, post, "Respuesta a la respuesta", reply);
        String deepest = commentId(beto, post, "Tercer nivel", nested);
        String second = commentId(beto, post, "Segundo", null);
        commentId(ana, createPost(ana), "De otra publicación", null);

        thread(ana, post).then().statusCode(200)
                .body("id", contains(first, reply, nested, deepest, second))
                .body("respondeA", contains(null, first, reply, nested, null))
                .body("respuestas", contains(1, 1, 1, 0, 0))
                .body("autor.id", contains(ana, beto, ana, beto, beto));
    }

    @Test
    void threadReturnsAtMostTheMostRecent200Comments() {
        String user = createUser();
        String post = createPost(user);
        driver.executableQuery("""
                        MATCH (author:Usuario {id: $user}), (p:Post {id: $post})
                        UNWIND range(0, 204) AS i
                        CREATE (author)-[:COMENTA]->(c:Comentario {
                            id: randomUUID(), texto: toString(i),
                            fecha: datetime({epochMillis: 1700000000000 + i * 1000})
                        })-[:EN]->(p)
                        """).withParameters(Map.of("user", user, "post", post)).execute();

        thread(user, post).then().statusCode(200)
                .body("size()", is(200))
                .body("texto[0]", is("5"))
                .body("texto[199]", is("204"));
        given().auth().oauth2(token(user)).get("/api/posts/{id}", post).then().statusCode(200)
                .body("comentarios", is(205));
    }

    @Test
    void threadOfAPostWithoutCommentsIsEmpty() {
        String user = createUser();

        thread(user, createPost(user)).then().statusCode(200).body("size()", is(0));
    }

    @Test
    void postDetailAndFeedCountRepliesToo() {
        String reader = createUser();
        String author = createUser();
        follow(reader, author);
        String post = createPost(author);
        String first = commentId(reader, post, "Uno", null);
        String reply = commentId(author, post, "Dos", first);
        commentId(reader, post, "Tres", reply);

        driver.executableQuery("""
                        MATCH (u:Usuario {id:$reader}), (p:Post {id:$post}) CREATE (u)-[:REACCIONA {tipo:'LIKE'}]->(p)
                        """).withParameters(Map.of("reader", reader, "post", post)).execute();

        given().auth().oauth2(token(reader)).get("/api/posts/{id}", post).then().statusCode(200)
                .body("comentarios", is(3)).body("reacciones", is(1)).body("reaccionado", is(true));
        given().auth().oauth2(token(author)).get("/api/posts/{id}", post).then().statusCode(200)
                .body("reacciones", is(1)).body("reaccionado", is(false));
        given().auth().oauth2(token(reader)).get("/api/feed").then().statusCode(200)
                .body("find { it.id == '%s' }.comentarios".formatted(post), is(3));
        given().auth().oauth2(token(reader)).get("/api/usuarios/{id}/posts", author).then().statusCode(200)
                .body("find { it.id == '%s' }.comentarios".formatted(post), is(3))
                .body("find { it.id == '%s' }.reaccionado".formatted(post), is(true));
    }

    @Test
    void newPostStartsWithoutComments() {
        String user = createUser();

        given().auth().oauth2(token(user)).multiPart("texto", "Hola").post("/api/posts").then().statusCode(201)
                .body("comentarios", is(0));
    }

    @Test
    void repliesStopAtTheMaximumDepthThatC8Reaches() {
        String user = createUser();
        String post = createPost(user);
        List<String> chain = new ArrayList<>();
        chain.add(commentId(user, post, "Nivel 0", null));
        for (int level = 1; level <= CommentRepository.MAX_DEPTH; level++) {
            String id = UUID.randomUUID().toString();
            driver.executableQuery("""
                            MATCH (u:Usuario {id:$user}), (padre:Comentario {id:$parent})
                            CREATE (u)-[:COMENTA]->(:Comentario {id:$id, texto:$text, fecha:datetime()})
                                   -[:RESPONDE_A]->(padre)
                            """).withParameters(Map.of("user", user, "parent", chain.getLast(), "id", id,
                    "text", "Nivel " + level)).execute();
            chain.add(id);
        }

        comment(user, post, "Al límite", chain.get(CommentRepository.MAX_DEPTH - 1)).then().statusCode(201);
        comment(user, post, "Demasiado profunda", chain.getLast()).then().statusCode(400)
                .body("error", is("VALIDACION"))
                .body("mensaje", is("El hilo alcanzó la profundidad máxima"));

        int total = CommentRepository.MAX_DEPTH + 2;
        thread(user, post).then().statusCode(200).body("size()", is(total))
                .body("texto", hasItem("Al límite")).body("texto", not(hasItem("Demasiado profunda")));
        given().auth().oauth2(token(user)).get("/api/posts/{id}", post).then().statusCode(200)
                .body("comentarios", is(total));
    }

    @Test
    void textMustHaveBetweenOneAnd280Characters() {
        String user = createUser();
        String post = createPost(createUser());

        for (String text : new String[] {"", "   ", "a".repeat(281)}) {
            comment(user, post, text, null).then().statusCode(400).body("error", is("VALIDACION"));
        }
        given().auth().oauth2(token(user)).contentType(ContentType.JSON).body("{}")
                .post("/api/posts/{id}/comentarios", post).then().statusCode(400).body("error", is("VALIDACION"));
        given().auth().oauth2(token(user)).contentType(ContentType.JSON)
                .post("/api/posts/{id}/comentarios", post).then().statusCode(400).body("error", is("VALIDACION"));

        comment(user, post, "😀".repeat(280), null).then().statusCode(201);
        assertEquals(1L, count("MATCH (:Comentario)-[:EN]->(:Post {id: $post}) RETURN count(*) AS total",
                Map.of("post", post)));
    }

    @Test
    void unknownPostReturns404() {
        String user = createUser();
        String unknown = UUID.randomUUID().toString();

        comment(user, unknown, "Hola", null).then().statusCode(404).body("error", is("POST_NO_ENCONTRADO"));
        thread(user, unknown).then().statusCode(404).body("error", is("POST_NO_ENCONTRADO"));
    }

    @Test
    void replyToUnknownCommentOrToAnotherPostReturns404() {
        String user = createUser();
        String post = createPost(user);
        String foreign = commentId(user, createPost(user), "De otra publicación", null);

        comment(user, post, "Hola", UUID.randomUUID().toString()).then().statusCode(404)
                .body("error", is("COMENTARIO_NO_ENCONTRADO"));
        comment(user, post, "Hola", foreign).then().statusCode(404)
                .body("error", is("COMENTARIO_NO_ENCONTRADO"));
        assertEquals(0L, count("MATCH (c:Comentario {texto: 'Hola'}) RETURN count(c) AS total", Map.of()));
    }

    @Test
    void commentWithTokenOfDeletedUserReturns404() {
        String post = createPost(createUser());

        comment(UUID.randomUUID().toString(), post, "Hola", null).then().statusCode(404)
                .body("error", is("USUARIO_NO_ENCONTRADO"));
    }

    @Test
    void everyEndpointRequiresToken() {
        String post = createPost(createUser());

        given().contentType(ContentType.JSON).body(Map.of("texto", "Hola"))
                .post("/api/posts/{id}/comentarios", post).then().statusCode(401)
                .body("error", is("NO_AUTENTICADO"));
        given().get("/api/posts/{id}/comentarios", post).then().statusCode(401)
                .body("error", is("NO_AUTENTICADO"));
    }

    @Test
    void endpointsAreDocumentedInOpenApi() {
        given().queryParam("format", "json")
                .when().get("/api/openapi")
                .then()
                .statusCode(200)
                .body("paths.'/api/posts/{id}/comentarios'.post.summary",
                        is("Comenta una publicación o responde a un comentario"))
                .body("paths.'/api/posts/{id}/comentarios'.post.tags", contains("Comentarios"))
                .body("paths.'/api/posts/{id}/comentarios'.post.responses.'201'", notNullValue())
                .body("paths.'/api/posts/{id}/comentarios'.post.responses.'400'", notNullValue())
                .body("paths.'/api/posts/{id}/comentarios'.post.responses.'404'", notNullValue())
                .body("paths.'/api/posts/{id}/comentarios'.get.responses.'200'", notNullValue())
                .body("paths.'/api/posts/{id}/comentarios'.get.security[0]", hasKey("SecurityScheme"));
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

    private void follow(String follower, String followed) {
        driver.executableQuery("""
                        MATCH (a:Usuario {id:$follower}), (b:Usuario {id:$followed})
                        CREATE (a)-[:SIGUE {desde: datetime()}]->(b)
                        """).withParameters(Map.of("follower", follower, "followed", followed)).execute();
    }

    private long count(String query, Map<String, Object> parameters) {
        return driver.executableQuery(query).withParameters(parameters).execute().records().getFirst()
                .get("total").asLong();
    }

    private String commentId(String user, String post, String text, String replyTo) {
        return comment(user, post, text, replyTo).then().statusCode(201).extract().path("id");
    }

    private static String token(String user) {
        return Jwt.subject(user).sign();
    }

    private static Response comment(String user, String post, String text, String replyTo) {
        Map<String, Object> body = new HashMap<>();
        body.put("texto", text);
        body.put("respondeA", replyTo);
        return given().auth().oauth2(token(user)).contentType(ContentType.JSON).body(body)
                .post("/api/posts/{id}/comentarios", post);
    }

    private static Response thread(String user, String post) {
        return given().auth().oauth2(token(user)).get("/api/posts/{id}/comentarios", post);
    }
}
