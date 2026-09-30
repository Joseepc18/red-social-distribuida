package com.redsocial.chat;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import jakarta.enterprise.context.ApplicationScoped;

import org.neo4j.driver.Driver;
import org.neo4j.driver.Record;

import com.redsocial.usuarios.UserSummary;

@ApplicationScoped
public class ChatRepository {
    private final Driver driver;

    public ChatRepository(Driver driver) {
        this.driver = driver;
    }

    public boolean userExists(String id) {
        return driver.executableQuery("RETURN EXISTS { (:Usuario {id:$id}) } AS found")
                .withParameters(Map.of("id", id)).execute().records().getFirst().get("found").asBoolean();
    }

    public Optional<ConversationResponse> create(String actor, String other, String id) {
        // Same ordered pair and unique conversation id on every instance and every retry.
        String first = actor.compareTo(other) < 0 ? actor : other;
        String second = first.equals(actor) ? other : actor;
        return driver.executableQuery("""
                MATCH (a:Usuario {id:$first}), (b:Usuario {id:$second}), (otro:Usuario {id:$other})
                MERGE (c:Conversacion {id:$id}) ON CREATE SET c.creadaEn=datetime()
                MERGE (a)-[:PARTICIPA]->(c)
                MERGE (b)-[:PARTICIPA]->(c)
                RETURN c.id AS id, toString(c.creadaEn) AS creadaEn,
                       otro.id AS usuarioId, otro.username AS username, otro.nombre AS nombre
                """).withParameters(Map.of("first", first, "second", second, "other", other, "id", id))
                .execute().records().stream().findFirst().map(ChatRepository::conversation);
    }

    public List<ConversationResponse> conversations(String actor) {
        return driver.executableQuery("""
                MATCH (yo:Usuario {id:$actor})-[:PARTICIPA]->(c:Conversacion)<-[:PARTICIPA]-(otro:Usuario)
                WHERE otro <> yo
                RETURN c.id AS id, toString(c.creadaEn) AS creadaEn,
                       otro.id AS usuarioId, otro.username AS username, otro.nombre AS nombre
                ORDER BY c.creadaEn DESC, c.id DESC
                """).withParameters(Map.of("actor", actor)).execute().records().stream()
                .map(ChatRepository::conversation).toList();
    }

    public boolean participates(String actor, String conversation) {
        return driver.executableQuery("""
                RETURN EXISTS { (:Usuario {id:$actor})-[:PARTICIPA]->(:Conversacion {id:$conversation}) } AS found
                """).withParameters(Map.of("actor", actor, "conversation", conversation))
                .execute().records().getFirst().get("found").asBoolean();
    }

    public List<ChatMessage> history(String actor, String conversation, MessageCursor before, int limit) {
        Map<String, Object> params = new HashMap<>();
        params.put("actor", actor);
        params.put("conversation", conversation);
        params.put("date", before == null ? null : before.date());
        params.put("id", before == null ? null : before.id());
        params.put("limit", limit);
        return driver.executableQuery("""
                MATCH (:Usuario {id:$actor})-[:PARTICIPA]->(c:Conversacion)
                      <-[:PERTENECE_A]-(m:Mensaje)<-[:ENVIA]-(autor:Usuario)
                WHERE c.id=$conversation AND ($date IS NULL OR m.fecha < datetime($date)
                      OR (m.fecha = datetime($date) AND m.id < $id))
                RETURN m.id AS id, c.id AS conversacionId, autor.id AS autorId,
                       m.texto AS texto, toString(m.fecha) AS fecha
                ORDER BY m.fecha DESC, m.id DESC LIMIT $limit
                """).withParameters(params).execute().records().stream().map(ChatRepository::message).toList();
    }

    public Optional<ChatEnvelope> save(String actor, String conversation, String id, String text) {
        // Membership and creation are in the same transaction. execute() commits before returning.
        return driver.executableQuery("""
                MATCH (autor:Usuario {id:$actor})-[:PARTICIPA]->(c:Conversacion {id:$conversation})
                MATCH (participante:Usuario)-[:PARTICIPA]->(c)
                WITH autor, c, collect(DISTINCT participante.id) AS participantes
                CREATE (autor)-[:ENVIA]->(m:Mensaje {id:$id, texto:$text, fecha:datetime()})-[:PERTENECE_A]->(c)
                RETURN m.id AS id, c.id AS conversacionId, autor.id AS autorId, m.texto AS texto,
                       toString(m.fecha) AS fecha, participantes
                """).withParameters(Map.of("actor", actor, "conversation", conversation, "id", id, "text", text))
                .execute().records().stream().findFirst().map(row ->
                        new ChatEnvelope(message(row), row.get("participantes").asList(value -> value.asString())));
    }

    private static ConversationResponse conversation(Record row) {
        return new ConversationResponse(row.get("id").asString(), row.get("creadaEn").asString(),
                new UserSummary(row.get("usuarioId").asString(), row.get("username").asString(),
                        row.get("nombre").asString()));
    }

    private static ChatMessage message(Record row) {
        return new ChatMessage(row.get("id").asString(), row.get("conversacionId").asString(),
                row.get("autorId").asString(), row.get("texto").asString(), row.get("fecha").asString());
    }
}
