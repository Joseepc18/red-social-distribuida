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
import org.eclipse.microprofile.openapi.annotations.tags.Tag;

import com.redsocial.shared.error.ErrorResponse;

import io.quarkus.security.Authenticated;

/**
 * Follow relationships between users. Shares the {@code /usuarios} root with the
 * profile resource; Quarkus REST routes each sub-path to the class that declares it.
 * Every method requires a valid JWT.
 */
@Path("/usuarios")
@Tag(name = "Social", description = "Seguir usuarios y consultas del grafo social")
@Produces(MediaType.APPLICATION_JSON)
@Authenticated
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
            description = "Responde 204 aunque no siguieras al usuario o este no exista.")
    @APIResponse(responseCode = "204", description = "Ya no sigues al usuario")
    @APIResponse(responseCode = "401", description = "Falta el token o no es válido",
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
    public List<UsuarioResumen> followers(@PathParam("id") String id) {
        return service.followers(id);
    }

    @GET
    @Path("{id}/seguidos")
    @Operation(summary = "Usuarios que sigue un usuario", description = "Ordenados por nombre de usuario.")
    @APIResponse(responseCode = "200", description = "Lista de seguidos (puede estar vacía)")
    @APIResponse(responseCode = "401", description = "Falta el token o no es válido",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    public List<UsuarioResumen> followed(@PathParam("id") String id) {
        return service.followed(id);
    }

    @GET
    @Path("me/sugerencias")
    @Operation(summary = "Sugerencias de usuarios a seguir",
            description = "Amigos de amigos que aún no sigues, ordenados por conexiones en común y luego por "
                    + "seguidores (máximo 10). Si no sigues a nadie, devuelve los usuarios con más seguidores.")
    @APIResponse(responseCode = "200", description = "Lista de sugerencias (puede estar vacía)")
    @APIResponse(responseCode = "401", description = "Falta el token o no es válido",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    public List<Sugerencia> suggestions() {
        return service.suggestions(jwt.getSubject());
    }

    @GET
    @Path("{id}/en-comun")
    @Operation(summary = "Seguidos en común con un usuario",
            description = "Usuarios que sigues tú y también el usuario indicado, ordenados por nombre de usuario.")
    @APIResponse(responseCode = "200", description = "Lista de seguidos en común (puede estar vacía)")
    @APIResponse(responseCode = "401", description = "Falta el token o no es válido",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    @APIResponse(responseCode = "404", description = "El usuario no existe (USUARIO_NO_ENCONTRADO)",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    public List<UsuarioResumen> mutuals(@PathParam("id") String id) {
        return service.mutuals(jwt.getSubject(), id);
    }

    @GET
    @Path("me/alcance")
    @Operation(summary = "Usuarios alcanzables",
            description = "Usuarios a los que llegas siguiendo relaciones SIGUE hasta 3 niveles, con la distancia "
                    + "mínima a cada uno y en via los usernames intermedios de ese camino, en orden (vacía a "
                    + "distancia 1). Si hay varios caminos igual de cortos, devuelve el primero ordenado por "
                    + "esos usernames. Ordenados por distancia y luego por nombre de usuario.")
    @APIResponse(responseCode = "200", description = "Lista de usuarios alcanzables (puede estar vacía)")
    @APIResponse(responseCode = "401", description = "Falta el token o no es válido",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    public List<Alcanzable> reach() {
        return service.reach(jwt.getSubject());
    }

    @GET
    @Path("{id}/separacion")
    @Operation(summary = "Grados de separación con un usuario",
            description = "Camino más corto sin dirección (hasta 6 saltos). Si no hay camino, grados es null "
                    + "y cadena está vacía.")
    @APIResponse(responseCode = "200", description = "Cadena de usuarios y grados de separación")
    @APIResponse(responseCode = "400", description = "Consulta con uno mismo (MISMO_USUARIO)",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    @APIResponse(responseCode = "401", description = "Falta el token o no es válido",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    @APIResponse(responseCode = "404", description = "El usuario no existe (USUARIO_NO_ENCONTRADO)",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    public Separacion separation(@PathParam("id") String id) {
        return service.separation(jwt.getSubject(), id);
    }
}
