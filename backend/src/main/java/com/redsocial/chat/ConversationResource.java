package com.redsocial.chat;

import java.util.List;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.QueryParam;
import jakarta.ws.rs.core.MediaType;
import org.eclipse.microprofile.jwt.JsonWebToken;
import org.eclipse.microprofile.openapi.annotations.Operation;
import org.eclipse.microprofile.openapi.annotations.parameters.Parameter;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponseSchema;
import org.eclipse.microprofile.openapi.annotations.tags.Tag;
import io.quarkus.security.Authenticated;

@Path("/conversaciones")
@Produces(MediaType.APPLICATION_JSON)
@Authenticated
@Tag(name = "Chat")
public class ConversationResource {
    public record CreateConversation(@NotBlank String usuarioId) { }
    private final ChatService service;
    private final JsonWebToken jwt;

    public ConversationResource(ChatService service, JsonWebToken jwt) {
        this.service=service;
        this.jwt=jwt;
    }

    @POST
    @Consumes(MediaType.APPLICATION_JSON)
    @Operation(summary = "Crea o recupera una conversación uno a uno",
            description = "Recibe {usuarioId}. Responde 200 tanto al crear como al reutilizar la conversación. "
                    + "Idempotente en ambos sentidos, incluso con solicitudes concurrentes. "
                    + "participante contiene id, username y nombre del otro usuario.")
    @APIResponseSchema(value = ConversationResponse.class, responseCode = "200")
    @APIResponse(responseCode = "400", description = "VALIDACION o CHAT_CON_UNO_MISMO")
    @APIResponse(responseCode = "401", description = "JWT ausente o inválido")
    @APIResponse(responseCode = "404", description = "USUARIO_NO_ENCONTRADO")
    public ConversationResponse create(@Valid @NotNull CreateConversation request) {
        return service.create(jwt.getSubject(), request.usuarioId());
    }

    @GET
    @Operation(summary = "Lista mis conversaciones",
            description = "Array sin paginación, ordenado por creadaEn e id descendentes. "
                    + "Cada elemento: {id, creadaEn, participante:{id, username, nombre}}; participante es el otro usuario. "
                    + "Sin conversaciones devuelve [].")
    @APIResponse(responseCode = "200", description = "Conversaciones del usuario autenticado")
    @APIResponse(responseCode = "401", description = "JWT ausente o inválido")
    @APIResponse(responseCode = "404", description = "USUARIO_NO_ENCONTRADO")
    public List<ConversationResponse> list() { return service.conversations(jwt.getSubject()); }

    @GET
    @Path("/{id}/mensajes")
    @Operation(summary = "Historial del chat por cursor",
            description = "Devuelve {mensajes:[{id, conversacionId, autorId, texto, fecha}], siguienteAntes}. "
                    + "Hasta 30 mensajes por fecha e id descendentes (más recientes primero). Sin antes devuelve "
                    + "los últimos mensajes; siguienteAntes se envía sin modificar en ?antes= para leer anteriores. "
                    + "Es null al terminar. El cursor es opaco, Base64url versionado de conversación, fecha e id; "
                    + "no es un offset y no sirve para otra conversación. Una conversación vacía devuelve "
                    + "mensajes:[] y siguienteAntes:null. No participar o un id inexistente devuelve 403.")
    @APIResponseSchema(value = MessagePage.class, responseCode = "200")
    @APIResponse(responseCode = "400", description = "CURSOR_INVALIDO")
    @APIResponse(responseCode = "401", description = "JWT ausente o inválido")
    @APIResponse(responseCode = "403", description = "NO_PARTICIPA")
    public MessagePage history(@PathParam("id") String id,
            @Parameter(description = "Cursor siguienteAntes de la página previa; omitir para la primera página")
            @QueryParam("antes") String before) {
        return service.history(jwt.getSubject(), id, before);
    }
}
