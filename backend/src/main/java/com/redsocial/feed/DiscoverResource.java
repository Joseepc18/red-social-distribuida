package com.redsocial.feed;

import java.util.List;

import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;

import org.eclipse.microprofile.jwt.JsonWebToken;
import org.eclipse.microprofile.openapi.annotations.Operation;
import org.eclipse.microprofile.openapi.annotations.enums.SchemaType;
import org.eclipse.microprofile.openapi.annotations.media.Content;
import org.eclipse.microprofile.openapi.annotations.media.Schema;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse;
import org.eclipse.microprofile.openapi.annotations.tags.Tag;

import io.quarkus.security.Authenticated;

@Path("/descubrir")
@Produces(MediaType.APPLICATION_JSON)
@Authenticated
@Tag(name = "Feed")
public class DiscoverResource {
    private final DiscoverService service;
    private final JsonWebToken jwt;

    public DiscoverResource(DiscoverService service, JsonWebToken jwt) {
        this.service = service;
        this.jwt = jwt;
    }

    @GET
    @Operation(summary = "Descubre publicaciones a partir de las reacciones de tus seguidos",
            description = "Consulta C7: publicaciones que reaccionaron usuarios que sigo, de autores que no sigo "
                    + "y distintos de mí. Identidad obtenida del JWT. Devuelve hasta 10 resultados sin paginación, "
                    + "ordenados por amigosQueReaccionaron (seguidos distintos) descendente, fecha descendente "
                    + "e id descendente para desempatar. Sin resultados devuelve []. Incluye autor proyectado "
                    + "y mediaUrl construida con MEDIA_PUBLIC_URL (por defecto /media/); null sin imagen.")
    @APIResponse(responseCode = "200", description = "Hasta 10 publicaciones descubiertas",
            content = @Content(schema = @Schema(type = SchemaType.ARRAY, implementation = DiscoverResponse.class,
                    maxItems = 10)))
    @APIResponse(responseCode = "401", description = "JWT ausente o inválido")
    @APIResponse(responseCode = "404", description = "USUARIO_NO_ENCONTRADO")
    public List<DiscoverResponse> find() {
        return service.find(jwt.getSubject());
    }
}
