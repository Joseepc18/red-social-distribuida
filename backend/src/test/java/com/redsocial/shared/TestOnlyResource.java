package com.redsocial.shared;

import jakarta.annotation.security.RolesAllowed;
import jakarta.inject.Inject;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;

import org.eclipse.microprofile.jwt.JsonWebToken;

import com.redsocial.shared.error.ApiException;

import io.quarkus.security.Authenticated;

/**
 * Endpoints that exist only in tests, to exercise error mapping and security.
 */
@Path("/test-only")
@Produces(MediaType.APPLICATION_JSON)
public class TestOnlyResource {

    public record Body(@NotBlank String nombre) {
    }

    @Inject
    JsonWebToken jwt;

    @GET
    @Path("/api-exception")
    public String apiException() {
        throw ApiException.conflict("PRUEBA_CONFLICTO", "Mensaje de prueba");
    }

    @GET
    @Path("/boom")
    public String boom() {
        throw new IllegalStateException("internal detail that must not leak");
    }

    @POST
    @Path("/validation")
    @Consumes(MediaType.APPLICATION_JSON)
    public Body validation(@Valid Body body) {
        return body;
    }

    @GET
    @Path("/protected")
    @Authenticated
    @Produces(MediaType.TEXT_PLAIN)
    public String authenticatedOnly() {
        return jwt.getSubject();
    }

    @GET
    @Path("/admin")
    @RolesAllowed("admin")
    @Produces(MediaType.TEXT_PLAIN)
    public String adminOnly() {
        return "ok";
    }
}
