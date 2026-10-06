package com.redsocial.feed;

import java.util.List;

import jakarta.ws.rs.DefaultValue;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.QueryParam;
import jakarta.ws.rs.core.MediaType;

import org.eclipse.microprofile.jwt.JsonWebToken;
import org.eclipse.microprofile.openapi.annotations.Operation;
import org.eclipse.microprofile.openapi.annotations.enums.SchemaType;
import org.eclipse.microprofile.openapi.annotations.media.Content;
import org.eclipse.microprofile.openapi.annotations.media.Schema;
import org.eclipse.microprofile.openapi.annotations.parameters.Parameter;
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
                    + "y distintos de mí. Identidad obtenida del JWT. Páginas de hasta 20 resultados, como el feed: "
                    + "page empieza en 0 y menos de 20 elementos indica el final. Orden por amigosQueReaccionaron "
                    + "(seguidos distintos) descendente, fecha descendente e id descendente para desempatar. "
                    + "Sin resultados devuelve []. Cada publicación tiene los mismos campos que en el feed "
                    + "(autor proyectado, reacciones, reaccionado, comentarios y mediaUrl construida con "
                    + "MEDIA_PUBLIC_URL, null sin imagen) más amigosQueReaccionaron.")
    @APIResponse(responseCode = "200", description = "Página de publicaciones descubiertas",
            content = @Content(schema = @Schema(type = SchemaType.ARRAY, implementation = DiscoverResponse.class)))
    @APIResponse(responseCode = "400", description = "Página negativa")
    @APIResponse(responseCode = "401", description = "JWT ausente o inválido")
    @APIResponse(responseCode = "404", description = "USUARIO_NO_ENCONTRADO o page no convertible a entero")
    public List<DiscoverResponse> find(
            @Parameter(description = "Página desde 0", schema = @Schema(minimum = "0", defaultValue = "0"))
            @QueryParam("page") @DefaultValue("0") int page) {
        return service.find(jwt.getSubject(), page);
    }
}
