package com.redsocial.chat;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.*;
import static org.junit.jupiter.api.Assertions.*;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import jakarta.inject.Inject;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.neo4j.driver.Driver;
import io.quarkus.test.junit.QuarkusTest;
import io.restassured.http.ContentType;
import io.smallrye.jwt.build.Jwt;

@QuarkusTest
class ChatResourceTest {
    @Inject Driver driver;
    @Inject ChatRepository repository;
    private final List<String> ids=new ArrayList<>();

    @AfterEach void cleanup() {
        driver.executableQuery("MATCH (n) WHERE n.id IN $ids DETACH DELETE n")
                .withParameters(Map.of("ids",ids)).execute();
    }

    @Test void createIsIdempotentInBothDirectionsEvenConcurrently() {
        String a=user(); String b=user();
        List<CompletableFuture<String>> requests=new ArrayList<>();
        for (int i=0;i<6;i++) {
            String actor=i%2==0?a:b; String other=actor.equals(a)?b:a;
            requests.add(CompletableFuture.supplyAsync(() -> create(actor,other)));
        }
        var found=requests.stream().map(CompletableFuture::join).toList();
        ids.addAll(found);
        assertEquals(1,new HashSet<>(found).size());
        var record=driver.executableQuery("MATCH (u:Usuario)-[r:PARTICIPA]->(c:Conversacion {id:$id}) RETURN count(r) AS n")
                .withParameters(Map.of("id",found.getFirst())).execute().records().getFirst();
        assertEquals(2,record.get("n").asInt());
        given().auth().oauth2(token(a)).get("/api/conversaciones").then().statusCode(200)
                .body("id",contains(found.getFirst())).body("[0].participante.id",is(b))
                .body("[0].participante.size()",is(3)).body(not(containsString("passwordHash")))
                .body(not(containsString("@test.invalid")));
        given().auth().oauth2(token(b)).get("/api/conversaciones").then().body("[0].participante.id",is(a));
        given().auth().oauth2(token(user())).get("/api/conversaciones").then().body("size()",is(0));
    }

    @Test void rejectsInvalidCreationAndAllRestEndpointsRequireJwt() {
        String actor=user();
        given().auth().oauth2(token(actor)).contentType(ContentType.JSON).body(Map.of("usuarioId",actor))
                .post("/api/conversaciones").then().statusCode(400).body("error",is("CHAT_CON_UNO_MISMO"));
        given().auth().oauth2(token(actor)).contentType(ContentType.JSON).body(Map.of("usuarioId",UUID.randomUUID().toString()))
                .post("/api/conversaciones").then().statusCode(404).body("error",is("USUARIO_NO_ENCONTRADO"));
        for (String body:List.of("{}","null","{\"usuarioId\":\" \"}")) {
            given().auth().oauth2(token(actor)).contentType(ContentType.JSON).body(body)
                    .post("/api/conversaciones").then().statusCode(400);
        }
        given().get("/api/conversaciones").then().statusCode(401);
        given().contentType(ContentType.JSON).body(Map.of("usuarioId",actor)).post("/api/conversaciones").then().statusCode(401);
        given().get("/api/conversaciones/x/mensajes").then().statusCode(401);
        // Query JWT is intentionally limited to the WebSocket path.
        given().queryParam("token",token(actor)).get("/api/conversaciones").then().statusCode(401);
    }

    @Test void cursorPaginatesTiesWithoutSkippingOrRepeatingAfterANewMessage() {
        String a=user(); String b=user(); String conversation=create(a,b); ids.add(conversation);
        List<String> expected=new ArrayList<>();
        for (int i=0;i<33;i++) {
            String id=UUID.randomUUID().toString(); ids.add(id); expected.add(id);
            driver.executableQuery("""
                    MATCH (u:Usuario {id:$user}),(c:Conversacion {id:$conversation})
                    CREATE (u)-[:ENVIA]->(:Mensaje {id:$id,texto:'Tie',fecha:datetime('2026-01-01T00:00:00Z')})-[:PERTENECE_A]->(c)
                    """).withParameters(Map.of("user",a,"conversation",conversation,"id",id)).execute();
        }
        expected.sort(Comparator.reverseOrder());
        var first=given().auth().oauth2(token(a)).get("/api/conversaciones/{id}/mensajes",conversation)
                .then().statusCode(200).body("mensajes.size()",is(30))
                .body("mensajes[0].conversacionId",is(conversation)).body("mensajes[0].autorId",is(a)).extract();
        assertEquals(expected.subList(0,30),first.path("mensajes.id"));
        String cursor=first.path("siguienteAntes"); assertNotNull(cursor);
        String newId=UUID.randomUUID().toString(); ids.add(newId);
        repository.save(b,conversation,newId,"New arrival").orElseThrow();
        var last=given().auth().oauth2(token(b)).queryParam("antes",cursor)
                .get("/api/conversaciones/{id}/mensajes",conversation).then().statusCode(200)
                .body("mensajes.size()",is(3)).body("siguienteAntes",nullValue()).extract();
        assertEquals(expected.subList(30,33),last.path("mensajes.id"));
        given().auth().oauth2(token(a)).get("/api/conversaciones/{id}/mensajes",conversation)
                .then().body("mensajes[0].id",is(newId));
    }

    @Test void cursorIsScopedAndHistoryCannotBeReadByAnOutsider() {
        String a=user(); String b=user(); String outsider=user();
        String first=create(a,b); String other=create(a,outsider); ids.addAll(List.of(first,other));
        given().auth().oauth2(token(a)).get("/api/conversaciones/{id}/mensajes",first)
                .then().statusCode(200).body("mensajes.size()",is(0)).body("siguienteAntes",nullValue());
        given().auth().oauth2(token(outsider)).get("/api/conversaciones/{id}/mensajes",first)
                .then().statusCode(403).body("error",is("NO_PARTICIPA"));
        given().auth().oauth2(token(a)).get("/api/conversaciones/missing/mensajes").then().statusCode(403);
        String cross=MessageCursor.encode(new ChatMessage(UUID.randomUUID().toString(),other,a,"Hi","2026-01-01T00:00:00Z"));
        for (String cursor:List.of("bad-cursor", " ",cross)) {
            given().auth().oauth2(token(a)).queryParam("antes",cursor).get("/api/conversaciones/{id}/mensajes",first)
                    .then().statusCode(400).body("error",is("CURSOR_INVALIDO"));
        }
    }

    @Test void swaggerContainsExactResponsesAndCursorContract() {
        given().queryParam("format","json").get("/api/openapi").then().statusCode(200)
                .body("paths.'/api/conversaciones'.post.responses.'200'.content.'application/json'.schema.'$ref'",is("#/components/schemas/ConversationResponse"))
                .body("paths.'/api/conversaciones'.get.responses.'200'.content.'application/json'.schema.type",is("array"))
                .body("paths.'/api/conversaciones/{id}/mensajes'.get.description",containsString("30 mensajes"))
                .body("paths.'/api/conversaciones/{id}/mensajes'.get.security[0]",hasKey("SecurityScheme"))
                .body("components.schemas.MessagePage.properties",hasKey("siguienteAntes"))
                .body("components.schemas.MessagePage.properties.mensajes.type",is("array"))
                .body("components.schemas.ChatMessage.properties",hasKey("autorId"));
    }

    private String user() {
        String id=UUID.randomUUID().toString(); ids.add(id);
        driver.executableQuery("CREATE (:Usuario {id:$id,username:$id,email:$email,nombre:'Chat test',passwordHash:'secret'})")
                .withParameters(Map.of("id",id,"email",id+"@test.invalid")).execute(); return id;
    }
    private static String token(String user) { return Jwt.subject(user).sign(); }
    private static String create(String actor,String other) {
        return given().auth().oauth2(token(actor)).contentType(ContentType.JSON).body(Map.of("usuarioId",other))
                .post("/api/conversaciones").then().statusCode(200).extract().path("id");
    }
}
