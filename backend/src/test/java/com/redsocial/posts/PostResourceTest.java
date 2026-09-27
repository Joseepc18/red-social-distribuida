package com.redsocial.posts;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.*;
import static org.junit.jupiter.api.Assertions.*;

import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;

import javax.imageio.ImageIO;

import jakarta.inject.Inject;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.neo4j.driver.Driver;

import com.redsocial.media.ImageValidator;

import io.quarkus.test.junit.QuarkusTest;
import io.restassured.response.Response;
import io.smallrye.jwt.build.Jwt;

@QuarkusTest
class PostResourceTest {
    @Inject Driver driver;
    @Inject TestMediaStorage storage;
    @Inject PostEventProbe events;

    @AfterEach
    void restoreStorage() {
        storage.failUploads(false);
    }

    @Test
    void createsTextOnlyPostAndEmitsOnceAfterCommitWithoutWaitingForObserver() throws Exception {
        String author = createUser();
        var gate = events.block(author);
        try {
            // The request must finish while the async observer is still waiting on the gate.
            Response response = CompletableFuture.supplyAsync(() -> post(author, "  Hola red  "))
                    .get(5, TimeUnit.SECONDS);
            String id = response.then().statusCode(201)
                    .header("Location", endsWith("/api/posts/" + response.path("id")))
                    .body("texto", is("Hola red"), "autor.id", is(author), "fecha", notNullValue())
                    .body("mediaKey", nullValue(), "mediaTipo", nullValue(), "mediaUrl", nullValue())
                    .body(not(containsString("passwordHash")))
                    .extract().path("id");
            assertEquals("/api/posts/" + id, java.net.URI.create(response.header("Location")).getPath());
            var received = events.await(author, 5000);
            assertNotNull(received);
            assertTrue(received.committed(), "The observer must read a committed post in its own transaction");
            assertEquals(id, received.event().postId());
            assertEquals(author, received.event().authorId());
            assertEquals("Hola red", received.event().text());
            assertEquals(1, gate.getCount(), "HTTP must not wait for observer completion");
            assertNull(events.await(author, 200), "A creation must emit only one event");
            given().auth().oauth2(token(author)).get("/api/posts/" + id)
                    .then().statusCode(200).body("id", is(id), "texto", is("Hola red"));
            var properties = driver.executableQuery("MATCH (p:Post {id:$id}) RETURN keys(p) AS keys")
                    .withParameters(Map.of("id", id)).execute().records().getFirst().get("keys").asList();
            assertEquals(3, properties.size());
            assertTrue(properties.containsAll(java.util.List.of("id", "texto", "fecha")));
        } finally {
            gate.countDown();
        }
    }

    @ParameterizedTest
    @CsvSource({"png,image/png,png", "jpeg,image/jpeg,jpg", "gif,image/gif,gif"})
    void uploadsSupportedImageWithGeneratedKeyAndNoBinaryInGraph(String format, String mime, String ext) throws Exception {
        String author = createUser();
        byte[] image = image(format);
        Response response = given().auth().oauth2(token(author)).multiPart("texto", "Con imagen")
                .multiPart("archivo", "../../client-name.exe", image, mime).post("/api/posts");
        String id = response.then().statusCode(201).body("mediaTipo", is(mime)).extract().path("id");
        String key = response.path("mediaKey");
        assertTrue(key.matches("posts/" + id + "/[0-9a-f-]{36}\\." + ext));
        assertEquals("/media/" + key, response.path("mediaUrl"));
        assertArrayEquals(image, storage.objects().get(key).bytes());
        assertEquals(mime, storage.objects().get(key).type());
        var row = driver.executableQuery("""
                        MATCH (:Usuario {id:$author})-[:PUBLICA]->(p:Post {id:$id})
                        RETURN keys(p) AS keys, p.mediaKey AS key, p.mediaTipo AS type
                        """).withParameters(Map.of("author", author, "id", id)).execute().records().getFirst();
        assertEquals(key, row.get("key").asString());
        assertEquals(mime, row.get("type").asString());
        assertEquals(5, row.get("keys").asList().size());
        assertTrue(events.await(author, 5000).committed());
    }

    @Test
    void rejectsInvalidInputsWithoutPersistingOrEmitting() throws Exception {
        String author = createUser();
        int objectsBefore = storage.objects().size();
        post(author, " ").then().statusCode(400).body("error", is("VALIDACION"));
        post(author, "a".repeat(5001)).then().statusCode(400);
        given().auth().oauth2(token(author)).multiPart("archivo", "x.png", image("png"), "image/png")
                .post("/api/posts").then().statusCode(400);
        upload(author, new byte[0], "image/png").then().statusCode(400);
        upload(author, "<script>alert(1)</script>".getBytes(), "image/png").then().statusCode(415);
        upload(author, "<svg xmlns='http://www.w3.org/2000/svg'/>".getBytes(), "image/svg+xml")
                .then().statusCode(415);
        upload(author, image("png"), "image/jpeg").then().statusCode(415);
        upload(author, new byte[(int) ImageValidator.MAX_BYTES + 1], "image/png")
                .then().statusCode(413).body("error", is("IMAGEN_DEMASIADO_GRANDE"));
        assertEquals(0, postCount(author));
        assertEquals(objectsBefore, storage.objects().size());
        assertNull(events.await(author, 300));
    }

    @Test
    void acceptsExactImageSizeAndLongUnicodeText() throws Exception {
        String author = createUser();
        byte[] paddedPng = java.util.Arrays.copyOf(image("png"), (int) ImageValidator.MAX_BYTES);
        given().auth().oauth2(token(author)).multiPart("texto", "🙂".repeat(5000), "text/plain; charset=UTF-8")
                .multiPart("archivo", "image.png", paddedPng, "image/png")
                .post("/api/posts").then().statusCode(201);
    }

    @Test
    void storageFailureDoesNotCreatePostOrEmitEvent() throws Exception {
        String author = createUser();
        storage.failUploads(true);
        upload(author, image("png"), "image/png").then().statusCode(503)
                .body("error", is("ALMACENAMIENTO_NO_DISPONIBLE"));
        assertEquals(0, postCount(author));
        assertNull(events.await(author, 300));
    }

    @Test
    void observerFailureDoesNotUndoCommittedPost() throws Exception {
        String author = createUser();
        String id = post(author, "observer-failure").then().statusCode(201).extract().path("id");
        assertTrue(events.await(author, 5000).committed());
        given().auth().oauth2(token(author)).get("/api/posts/" + id).then().statusCode(200);
    }

    @Test
    void routesRequireJwtAndNeverTrustAuthorFromForm() {
        String author = createUser();
        String other = createUser();
        given().multiPart("texto", "No token").post("/api/posts").then().statusCode(401);
        given().get("/api/posts/missing").then().statusCode(401);
        given().get("/api/usuarios/" + author + "/posts").then().statusCode(401);
        given().auth().oauth2("invalid").multiPart("texto", "Bad JWT").post("/api/posts").then().statusCode(401);
        given().auth().oauth2(token(author)).multiPart("texto", "Autor seguro").multiPart("authorId", other)
                .post("/api/posts").then().statusCode(201).body("autor.id", is(author));
        post(UUID.randomUUID().toString(), "Deleted author").then().statusCode(404);
    }

    @Test
    void listsOnlyRequestedAuthorsPostsInStablePagesAndKeepsExistingRoutes() {
        String author = createUser();
        String reader = createUser();
        driver.executableQuery("""
                        MATCH (u:Usuario {id:$id}) UNWIND range(1,21) AS n
                        CREATE (u)-[:PUBLICA]->(:Post {id: randomUUID(), texto: toString(n),
                                                     fecha: datetime() + duration({seconds:n})})
                        """).withParameters(Map.of("id", author)).execute();
        post(reader, "Other author").then().statusCode(201);
        given().auth().oauth2(token(reader)).get("/api/usuarios/" + author + "/posts")
                .then().statusCode(200).body("size()", is(20), "[0].texto", is("21"), "[19].texto", is("2"))
                .body("autor.id", everyItem(is(author))).body(not(containsString("passwordHash")));
        given().auth().oauth2(token(reader)).queryParam("page", 1).get("/api/usuarios/" + author + "/posts")
                .then().statusCode(200).body("size()", is(1), "[0].texto", is("1"));
        given().auth().oauth2(token(reader)).queryParam("page", 2).get("/api/usuarios/" + author + "/posts")
                .then().statusCode(200).body("$", empty());
        given().auth().oauth2(token(reader)).queryParam("page", -1).get("/api/usuarios/" + author + "/posts")
                .then().statusCode(400);
        given().auth().oauth2(token(reader)).get("/api/usuarios/" + createUser() + "/posts")
                .then().statusCode(200).body("$", empty());
        given().auth().oauth2(token(reader)).get("/api/usuarios/missing/posts").then().statusCode(404);
        given().auth().oauth2(token(reader)).get("/api/posts/missing").then().statusCode(404);
        given().auth().oauth2(token(reader)).get("/api/usuarios/" + author).then().statusCode(200);
        given().auth().oauth2(token(reader)).get("/api/usuarios/" + author + "/seguidores").then().statusCode(200);
    }

    @Test
    void openApiDocumentsAllThreeRoutesAndMultipart() {
        given().queryParam("format", "json").get("/api/openapi").then().statusCode(200)
                .body("paths.'/api/posts'.post.requestBody.content.'multipart/form-data'", notNullValue())
                .body("paths.'/api/posts/{id}'.get", notNullValue())
                .body("paths.'/api/usuarios/{id}/posts'.get", notNullValue());
    }

    private String createUser() {
        String id = UUID.randomUUID().toString();
        driver.executableQuery("""
                        CREATE (:Usuario {id:$id, username:$id, email:$email, nombre:'Test author',
                                          passwordHash:'never-return-this', bio:'', creadoEn:datetime()})
                        """).withParameters(Map.of("id", id, "email", id + "@test.invalid")).execute();
        return id;
    }

    private long postCount(String author) {
        return driver.executableQuery("MATCH (:Usuario {id:$id})-[:PUBLICA]->(p:Post) RETURN count(p) AS n")
                .withParameters(Map.of("id", author)).execute().records().getFirst().get("n").asLong();
    }

    private static String token(String author) {
        return Jwt.subject(author).sign();
    }

    private static Response post(String author, String text) {
        return given().auth().oauth2(token(author)).multiPart("texto", text).post("/api/posts");
    }

    private static Response upload(String author, byte[] bytes, String mime) {
        return given().auth().oauth2(token(author)).multiPart("texto", "Imagen de prueba")
                .multiPart("archivo", "test.bin", bytes, mime).post("/api/posts");
    }

    static byte[] image(String format) throws Exception {
        ByteArrayOutputStream output = new ByteArrayOutputStream();
        ImageIO.write(new BufferedImage(2, 2, BufferedImage.TYPE_INT_RGB), format, output);
        return output.toByteArray();
    }
}
