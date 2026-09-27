package com.redsocial.auth;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

import org.eclipse.microprofile.openapi.annotations.Operation;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponseSchema;
import org.eclipse.microprofile.openapi.annotations.tags.Tag;

import com.redsocial.usuarios.Profile;

/**
 * Public endpoints: registration and login. The login issues the JWT that every private
 * endpoint requires; the server keeps no session.
 */
@Path("/auth")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@Tag(name = "Autenticación")
public class AuthResource {

    private final AuthService service;

    public AuthResource(AuthService service) {
        this.service = service;
    }

    @POST
    @Path("/registro")
    @Operation(summary = "Registra un usuario nuevo")
    @APIResponseSchema(value = Profile.class, responseCode = "201", responseDescription = "Usuario creado")
    @APIResponse(responseCode = "400", description = "VALIDACION: faltan datos")
    @APIResponse(responseCode = "409", description = "USERNAME_EN_USO o EMAIL_EN_USO")
    public Response register(@Valid @NotNull(message = "el cuerpo es obligatorio") RegisterRequest request) {
        return Response.status(Response.Status.CREATED)
                .entity(service.register(request))
                .build();
    }

    @POST
    @Path("/login")
    @Operation(summary = "Inicia sesión y devuelve un JWT válido por 24 horas")
    @APIResponse(responseCode = "200", description = "Token JWT")
    @APIResponse(responseCode = "400", description = "VALIDACION: faltan datos")
    @APIResponse(responseCode = "401", description = "CREDENCIALES_INVALIDAS")
    public LoginResponse login(@Valid @NotNull(message = "el cuerpo es obligatorio") LoginRequest request) {
        return service.login(request);
    }
}
