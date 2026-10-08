package com.redsocial.notificaciones;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.DELETE;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
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
 * Web Push subscriptions. The public key is public because the browser needs it
 * before subscribing; registering and removing subscriptions require a JWT.
 */
@Path("/push")
@Tag(name = "Notificaciones", description = "Suscripciones Web Push")
@Produces(MediaType.APPLICATION_JSON)
public class PushResource {

    private final PushSubscriptionService service;
    private final JsonWebToken jwt;

    public PushResource(PushSubscriptionService service, JsonWebToken jwt) {
        this.service = service;
        this.jwt = jwt;
    }

    @GET
    @Path("/clave-publica")
    @Operation(summary = "Clave pública VAPID",
            description = "Se usa como applicationServerKey en pushManager.subscribe. No requiere JWT.")
    @APIResponse(responseCode = "200", description = "Clave pública VAPID en base64url")
    @APIResponse(responseCode = "503", description = "El servidor no tiene claves VAPID (PUSH_NO_CONFIGURADO)",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    public ClavePublica publicKey() {
        return service.publicKey();
    }

    @POST
    @Path("/suscripciones")
    @Authenticated
    @Consumes(MediaType.APPLICATION_JSON)
    @Operation(summary = "Registra la suscripción del navegador",
            description = "Idempotente por endpoint. Si el endpoint ya estaba registrado, pasa a pertenecer al "
                    + "usuario autenticado.")
    @APIResponse(responseCode = "204", description = "Suscripción registrada")
    @APIResponse(responseCode = "400", description = "Faltan endpoint, p256dh o auth (VALIDACION)",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    @APIResponse(responseCode = "401", description = "Falta el token o no es válido",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    @APIResponse(responseCode = "409", description = "Máximo de suscripciones del usuario alcanzado (LIMITE_SUSCRIPCIONES)",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    @APIResponse(responseCode = "404", description = "El usuario del token no existe (USUARIO_NO_ENCONTRADO)",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    public void subscribe(@Valid @NotNull(message = "el cuerpo es obligatorio") SuscripcionRequest request) {
        service.subscribe(jwt.getSubject(), request);
    }

    @DELETE
    @Path("/suscripciones")
    @Authenticated
    @Consumes(MediaType.APPLICATION_JSON)
    @Operation(summary = "Elimina una suscripción del usuario",
            description = "Elimina la suscripción indicada por endpoint si pertenece al usuario autenticado. "
                    + "Responde 204 aunque no exista.")
    @APIResponse(responseCode = "204", description = "Suscripción eliminada")
    @APIResponse(responseCode = "400", description = "Falta endpoint (VALIDACION)",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    @APIResponse(responseCode = "401", description = "Falta el token o no es válido",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    public void unsubscribe(@Valid @NotNull(message = "el cuerpo es obligatorio") EndpointRequest request) {
        service.unsubscribe(jwt.getSubject(), request.endpoint());
    }
}
