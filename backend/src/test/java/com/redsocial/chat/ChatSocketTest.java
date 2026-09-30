package com.redsocial.chat;

import static org.junit.jupiter.api.Assertions.*;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.WebSocket;
import java.net.http.WebSocketHandshakeException;
import java.nio.ByteBuffer;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionException;
import java.util.concurrent.CompletionStage;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import jakarta.inject.Inject;
import org.eclipse.microprofile.config.ConfigProvider;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.neo4j.driver.Driver;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.redsocial.shared.error.ApiException;
import io.quarkus.redis.datasource.RedisDataSource;
import io.quarkus.test.common.http.TestHTTPResource;
import io.quarkus.test.junit.QuarkusTest;
import io.smallrye.jwt.build.Jwt;
import io.smallrye.mutiny.Uni;

@QuarkusTest
class ChatSocketTest {
    @TestHTTPResource("/") URI base;
    @Inject Driver driver;
    @Inject ChatService service;
    @Inject ChatRepository repository;
    @Inject ChatSessions sessions;
    @Inject RedisDataSource redis;
    @Inject ObjectMapper json;
    private final List<String> ids=new ArrayList<>();
    private final List<Client> clients=new ArrayList<>();

    @AfterEach void cleanup() {
        clients.forEach(client -> client.socket.abort());
        driver.executableQuery("""
                MATCH (c:Conversacion) WHERE c.id IN $ids
                OPTIONAL MATCH (m:Mensaje)-[:PERTENECE_A]->(c) DETACH DELETE m
                """).withParameters(Map.of("ids",ids)).execute();
        driver.executableQuery("MATCH (n) WHERE n.id IN $ids DETACH DELETE n")
                .withParameters(Map.of("ids",ids)).execute();
    }

    @Test void rejectsMissingInvalidExpiredAndWrongIssuerTokensBeforeUpgrade() {
        String user=user();
        for (String query:List.of("", "?token=invalid", "?token="+Jwt.subject(user).expiresAt(1).sign(),
                "?token="+Jwt.issuer("wrong").subject(user).sign(),"?token=x&token=y")) {
            var failure=assertThrows(CompletionException.class,() -> HttpClient.newHttpClient().newWebSocketBuilder()
                    .buildAsync(wsUri(query),new Client()).join());
            assertInstanceOf(WebSocketHandshakeException.class,failure.getCause());
            assertEquals(401,((WebSocketHandshakeException)failure.getCause()).getResponse().statusCode());
        }
    }

    @Test void persistsBeforePublishingAndDeliversOnceToAllParticipantSessionsOnly() throws Exception {
        String a=user(); String b=user(); String outsider=user(); String conversation=conversation(a,b);
        Client sender=connect(a); Client receiver=connect(b); Client secondTab=connect(b); Client stranger=connect(outsider);
        BlockingQueue<ChatEnvelope> published=new LinkedBlockingQueue<>();
        var subscriber=redis.pubsub(ChatEnvelope.class).subscribe("chat",published::add);
        try {
            sender.send(Map.of("tipo","mensaje","conversacionId",conversation,"texto"," Hola ","autorId",outsider));
            JsonNode sent=sender.next(); JsonNode received=receiver.next(); JsonNode tab=secondTab.next();
            assertEquals(sent,received); assertEquals(sent,tab);
            assertEquals("mensaje",sent.path("tipo").asText());
            assertEquals("Hola",sent.at("/mensaje/texto").asText());
            assertEquals(a,sent.at("/mensaje/autorId").asText());
            ChatEnvelope envelope=published.poll(5,TimeUnit.SECONDS); assertNotNull(envelope);
            assertEquals(sent.at("/mensaje/id").asText(),envelope.mensaje().id());
            assertTrue(service.history(a,conversation,null).mensajes().stream().anyMatch(m -> m.id().equals(envelope.mensaje().id())));
            assertNull(stranger.messages.poll(300,TimeUnit.MILLISECONDS));
            assertNull(sender.messages.poll(300,TimeUnit.MILLISECONDS));
            assertNull(receiver.messages.poll(300,TimeUnit.MILLISECONDS));
        } finally { subscriber.unsubscribe(); }
    }

    @Test void redisMessagesFromAnotherPublisherReachLocalParticipants() throws Exception {
        String a=user(); String b=user(); String conversation=conversation(a,b);
        Client receiver=connect(b);
        ChatEnvelope envelope=repository.save(a,conversation,UUID.randomUUID().toString(),"Otra instancia").orElseThrow();
        redis.pubsub(ChatEnvelope.class).publish("chat",envelope);
        assertEquals(envelope.mensaje().id(),receiver.next().at("/mensaje/id").asText());
    }

    @Test void unauthorizedAndMalformedMessagesAreRejectedWithoutPersistence() throws Exception {
        String a=user(); String b=user(); String conversation=conversation(a,b);
        Client outsider=connect(user());
        outsider.send(Map.of("tipo","mensaje","conversacionId",conversation,"texto","Forbidden"));
        assertEquals("NO_PARTICIPA",outsider.next().path("error").asText());
        Client sender=connect(a);
        for (String raw:List.of("{", "null", "{\"tipo\":\"other\"}",
                json.writeValueAsString(Map.of("tipo","mensaje","conversacionId",conversation,"texto"," ")),
                json.writeValueAsString(Map.of("tipo","mensaje","conversacionId",conversation,"texto","a".repeat(2001))))) {
            sender.socket.sendText(raw,true).join(); assertEquals("error",sender.next().path("tipo").asText());
        }
        assertTrue(service.history(a,conversation,null).mensajes().isEmpty());
        sender.send(Map.of("tipo","mensaje","conversacionId",conversation,"texto","Después del error"));
        assertEquals("Después del error",sender.next().at("/mensaje/texto").asText());
    }

    @Test void failedBrokerStillDeliversCommittedMessageLocallyAndNeverPublishesForbiddenWrites() throws Exception {
        String a=user(); String b=user(); String conversation=conversation(a,b);
        Client receiver=connect(b); AtomicInteger calls=new AtomicInteger();
        ChatBroker unavailable=envelope -> {
            calls.incrementAndGet();
            assertEquals(envelope.mensaje().id(),service.history(a,conversation,null).mensajes().getFirst().id());
            return Uni.createFrom().failure(new IllegalStateException("Redis outage"));
        };
        ChatService fallback=new ChatService(repository,unavailable,sessions);
        fallback.send(a,conversation,"Persistido sin Redis");
        assertEquals("Persistido sin Redis",receiver.next().at("/mensaje/texto").asText());
        assertEquals(1,calls.get());
        assertThrows(ApiException.class,() -> fallback.send(user(),conversation,"Forbidden"));
        assertEquals(1,calls.get());
        assertEquals(1,service.history(a,conversation,null).mensajes().size());
    }

    @Test void serverSendsProtocolPingEveryThirtySeconds() throws Exception {
        assertEquals(Duration.ofSeconds(30),ConfigProvider.getConfig()
                .getValue("quarkus.websockets-next.server.auto-ping-interval",Duration.class));
        Client client=connect(user());
        assertTrue(client.ping.await(35,TimeUnit.SECONDS),"Expected protocol ping, not a JSON message");
    }

    private String user() {
        String id=UUID.randomUUID().toString(); ids.add(id);
        driver.executableQuery("CREATE (:Usuario {id:$id,username:$id,email:$email,nombre:'Socket test',passwordHash:'secret'})")
                .withParameters(Map.of("id",id,"email",id+"@test.invalid")).execute(); return id;
    }
    private String conversation(String a,String b) { String id=service.create(a,b).id(); ids.add(id); return id; }
    private URI wsUri(String query) { return URI.create("ws://"+base.getAuthority()+"/ws/chat"+query); }
    private Client connect(String user) {
        Client client=new Client();
        client.socket=HttpClient.newHttpClient().newWebSocketBuilder()
                .connectTimeout(Duration.ofSeconds(5)).buildAsync(wsUri("?token="+Jwt.subject(user).sign()),client).join();
        clients.add(client); return client;
    }
    private class Client implements WebSocket.Listener {
        WebSocket socket;
        final BlockingQueue<String> messages=new LinkedBlockingQueue<>();
        final CountDownLatch ping=new CountDownLatch(1);
        final StringBuilder text=new StringBuilder();
        @Override public void onOpen(WebSocket socket) { socket.request(1); }
        @Override public CompletionStage<?> onText(WebSocket socket,CharSequence data,boolean last) {
            text.append(data); if (last) { messages.add(text.toString()); text.setLength(0); }
            socket.request(1); return CompletableFuture.completedFuture(null);
        }
        @Override public CompletionStage<?> onPing(WebSocket socket,ByteBuffer data) {
            ping.countDown(); socket.request(1); return socket.sendPong(data);
        }
        void send(Object input) throws Exception { socket.sendText(json.writeValueAsString(input),true).join(); }
        JsonNode next() throws Exception {
            String message=messages.poll(7,TimeUnit.SECONDS); assertNotNull(message,"Missing WebSocket message"); return json.readTree(message);
        }
    }
}
