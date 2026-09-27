package com.redsocial.posts;

import java.util.List;

import jakarta.ws.rs.DefaultValue;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.QueryParam;
import jakarta.ws.rs.core.MediaType;

import org.eclipse.microprofile.openapi.annotations.Operation;
import org.eclipse.microprofile.openapi.annotations.parameters.Parameter;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse;
import org.eclipse.microprofile.openapi.annotations.tags.Tag;

import io.quarkus.security.Authenticated;
import io.smallrye.common.annotation.Blocking;

/** Shares the /usuarios root with profiles and follow resources. */
@Path("/usuarios")
@Produces(MediaType.APPLICATION_JSON)
@Authenticated
@Blocking
@Tag(name = "Publicaciones")
public class UserPostResource {
    private final PostService service;

    public UserPostResource(PostService service) {
        this.service = service;
    }

    @GET
    @Path("/{id}/posts")
    @Operation(summary = "Publicaciones de un usuario",
            description = "Lista de hasta 20 publicaciones, ordenadas por fecha e id descendentes. "
                    + "page empieza en 0; una lista con menos de 20 elementos indica el final.")
    @APIResponse(responseCode = "200", description = "Lista de publicaciones; vacía si no hay más")
    @APIResponse(responseCode = "400", description = "Página inválida")
    @APIResponse(responseCode = "401", description = "JWT ausente o inválido")
    @APIResponse(responseCode = "404", description = "USUARIO_NO_ENCONTRADO")
    public List<PostResponse> byAuthor(@PathParam("id") String id,
            @Parameter(description = "Página desde 0") @QueryParam("page") @DefaultValue("0") int page) {
        return service.byAuthor(id, page);
    }
}
