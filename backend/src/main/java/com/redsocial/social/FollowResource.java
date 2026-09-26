package com.redsocial.social;

import java.util.List;

import jakarta.ws.rs.DELETE;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;

import org.eclipse.microprofile.jwt.JsonWebToken;
import org.eclipse.microprofile.openapi.annotations.Operation;
import org.eclipse.microprofile.openapi.annotations.media.Content;
import org.eclipse.microprofile.openapi.annotations.media.Schema;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse;
import org.eclipse.microprofile.openapi.annotations.security.SecurityRequirement;
import org.eclipse.microprofile.openapi.annotations.tags.Tag;

import com.redsocial.shared.error.ErrorResponse;

/**
 * Follow relationships between users. Shares the {@code /usuarios} root with the
 * profile resource; Quarkus REST routes each sub-path to the class that declares it.
 * No security annotation: every method requires a valid JWT (default-roles-allowed).
 */
@Path("/usuarios")
@Tag(name = "Social", description = "Seguir y dejar de seguir usuarios")
@SecurityRequirement(name = "SecurityScheme")
@Produces(MediaType.APPLICATION_JSON)
public class FollowResource {

    private final FollowService service;
    private final JsonWebToken jwt;

    public FollowResource(FollowService service, JsonWebToken jwt) {
        this.service = service;
        this.jwt = jwt;
    }

    @POST
    @Path("{id}/seguir")
    @Operation(summary = "Seguir a un usuario",
            description = "Idempotente: seguir de nuevo a alguien no duplica la relación ni cambia su fecha.")
    @APIResponse(responseCode = "204", description = "Ahora sigues al usuario")
    @APIResponse(responseCode = "400", description = "Intento de seguirse a uno mismo (NO_PUEDE_SEGUIRSE)",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    @APIResponse(responseCode = "401", description = "Falta el token o no es válido",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    @APIResponse(responseCode = "404", description = "El usuario no existe (USUARIO_NO_ENCONTRADO)",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    public void follow(@PathParam("id") String id) {
        service.follow(jwt.getSubject(), id);
    }

    @DELETE
    @Path("{id}/seguir")
    @Operation(summary = "Dejar de seguir a un usuario",
            description = "Idempotente: responde 204 aunque no siguieras al usuario.")
    @APIResponse(responseCode = "204", description = "Ya no sigues al usuario")
    @APIResponse(responseCode = "401", description = "Falta el token o no es válido",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    @APIResponse(responseCode = "404", description = "El usuario no existe (USUARIO_NO_ENCONTRADO)",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    public void unfollow(@PathParam("id") String id) {
        service.unfollow(jwt.getSubject(), id);
    }

    @GET
    @Path("{id}/seguidores")
    @Operation(summary = "Seguidores de un usuario", description = "Ordenados por nombre de usuario.")
    @APIResponse(responseCode = "200", description = "Lista de seguidores (puede estar vacía)")
    @APIResponse(responseCode = "401", description = "Falta el token o no es válido",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    @APIResponse(responseCode = "404", description = "El usuario no existe (USUARIO_NO_ENCONTRADO)",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    public List<UsuarioResumen> followers(@PathParam("id") String id) {
        return service.followers(id);
    }

    @GET
    @Path("{id}/seguidos")
    @Operation(summary = "Usuarios que sigue un usuario", description = "Ordenados por nombre de usuario.")
    @APIResponse(responseCode = "200", description = "Lista de seguidos (puede estar vacía)")
    @APIResponse(responseCode = "401", description = "Falta el token o no es válido",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    @APIResponse(responseCode = "404", description = "El usuario no existe (USUARIO_NO_ENCONTRADO)",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    public List<UsuarioResumen> followed(@PathParam("id") String id) {
        return service.followed(id);
    }
}
