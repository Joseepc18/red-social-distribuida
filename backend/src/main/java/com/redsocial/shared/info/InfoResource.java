package com.redsocial.shared.info;

import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;

import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.eclipse.microprofile.openapi.annotations.Operation;
import org.eclipse.microprofile.openapi.annotations.tags.Tag;

/**
 * Tells which backend instance served the request, to show load balancing live.
 */
@Path("/info")
@Tag(name = "Info")
public class InfoResource {

    public record InfoResponse(String instancia) {
    }

    private final String instanceId;

    public InfoResource(@ConfigProperty(name = "app.instance-id") String instanceId) {
        this.instanceId = instanceId;
    }

    @GET
    @Produces(MediaType.APPLICATION_JSON)
    @Operation(summary = "Instancia del backend que atendió la petición")
    public InfoResponse info() {
        return new InfoResponse(instanceId);
    }
}
