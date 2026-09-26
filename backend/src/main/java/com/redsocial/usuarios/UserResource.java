package com.redsocial.usuarios;

import java.util.List;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.PUT;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.QueryParam;
import jakarta.ws.rs.core.MediaType;

import org.eclipse.microprofile.jwt.JsonWebToken;
import org.eclipse.microprofile.openapi.annotations.Operation;
import org.eclipse.microprofile.openapi.annotations.parameters.Parameter;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse;
import org.eclipse.microprofile.openapi.annotations.security.SecurityRequirement;
import org.eclipse.microprofile.openapi.annotations.tags.Tag;

/**
 * User profiles and search. No security annotation: every endpoint requires a valid JWT
 * ({@code quarkus.security.jaxrs.default-roles-allowed=**}). The "/me" endpoints take the
 * identity from the token subject, never from the URL or the body.
 */
@Path("/usuarios")
@Produces(MediaType.APPLICATION_JSON)
@Tag(name = "Usuarios")
@SecurityRequirement(name = "SecurityScheme")
public class UserResource {

    private final UserService service;
    private final JsonWebToken jwt;

    public UserResource(UserService service, JsonWebToken jwt) {
        this.service = service;
        this.jwt = jwt;
    }

    @GET
    @Path("/me")
    @Operation(summary = "Perfil propio (identidad tomada del JWT)")
    @APIResponse(responseCode = "200", description = "Perfil propio, incluye el email")
    @APIResponse(responseCode = "401", description = "NO_AUTENTICADO, o USUARIO_NO_ENCONTRADO si la cuenta del token ya no existe")
    public OwnProfile me() {
        return service.ownProfile(jwt.getSubject());
    }

    @PUT
    @Path("/me")
    @Consumes(MediaType.APPLICATION_JSON)
    @Operation(summary = "Edita el perfil propio (solo nombre y bio)")
    @APIResponse(responseCode = "200", description = "Perfil actualizado")
    @APIResponse(responseCode = "400", description = "VALIDACION: datos inválidos")
    @APIResponse(responseCode = "401", description = "NO_AUTENTICADO, o USUARIO_NO_ENCONTRADO si la cuenta del token ya no existe")
    public OwnProfile updateMe(@Valid @NotNull(message = "el cuerpo es obligatorio") UpdateProfileRequest request) {
        return service.updateOwnProfile(jwt.getSubject(), request);
    }

    @GET
    @Path("/{id}")
    @Operation(summary = "Perfil público de un usuario")
    @APIResponse(responseCode = "200", description = "Perfil público, sin email")
    @APIResponse(responseCode = "401", description = "NO_AUTENTICADO")
    @APIResponse(responseCode = "404", description = "USUARIO_NO_ENCONTRADO")
    public PublicProfile byId(@PathParam("id") String id) {
        return service.publicProfile(id);
    }

    @GET
    @Operation(summary = "Busca usuarios por username o nombre (máximo 20, ordenados por username)")
    @APIResponse(responseCode = "200", description = "Resultados; lista vacía si q está vacío")
    @APIResponse(responseCode = "400", description = "VALIDACION: q supera 50 caracteres")
    @APIResponse(responseCode = "401", description = "NO_AUTENTICADO")
    public List<UserSummary> search(
            @Parameter(description = "Texto a buscar, sin distinguir mayúsculas")
            @QueryParam("q") @Size(max = 50, message = "debe tener como máximo 50 caracteres") String q) {
        return service.search(q);
    }
}
