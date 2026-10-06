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

import com.redsocial.posts.PostResponse;

import io.quarkus.security.Authenticated;

@Path("/feed")
@Produces(MediaType.APPLICATION_JSON)
@Authenticated
@Tag(name = "Feed")
public class FeedResource {
    private final FeedService service;
    private final JsonWebToken jwt;

    public FeedResource(FeedService service, JsonWebToken jwt) {
        this.service = service;
        this.jwt = jwt;
    }

    @GET
    @Operation(summary = "Feed personalizado de usuarios seguidos",
            description = "Consulta C1: Usuario → SIGUE → Usuario → PUBLICA → Post. "
                    + "Identidad obtenida del JWT. Array de hasta 20 publicaciones por fecha e id descendentes, "
                    + "con autor, reacciones, reaccionado y comentarios. page empieza en 0; menos de 20 elementos "
                    + "indica el final. "
                    + "Sin seguidos o publicaciones devuelve []. mediaUrl usa MEDIA_PUBLIC_URL (por defecto /media/).")
    @APIResponse(responseCode = "200", description = "Página del feed",
            content = @Content(schema = @Schema(type = SchemaType.ARRAY, implementation = PostResponse.class)))
    @APIResponse(responseCode = "400", description = "Página negativa")
    @APIResponse(responseCode = "401", description = "JWT ausente o inválido")
    @APIResponse(responseCode = "404", description = "USUARIO_NO_ENCONTRADO o page no convertible a entero")
    public List<PostResponse> find(
            @Parameter(description = "Página desde 0", schema = @Schema(minimum = "0", defaultValue = "0"))
            @QueryParam("page") @DefaultValue("0") int page) {
        return service.find(jwt.getSubject(), page);
    }
}
