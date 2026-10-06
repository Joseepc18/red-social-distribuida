package com.redsocial.comentarios;

import java.util.List;

import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

import org.eclipse.microprofile.jwt.JsonWebToken;
import org.eclipse.microprofile.openapi.annotations.Operation;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponseSchema;
import org.eclipse.microprofile.openapi.annotations.tags.Tag;

import io.quarkus.security.Authenticated;

/** Shares the /posts root with the posts resource. */
@Path("/posts")
@Produces(MediaType.APPLICATION_JSON)
@Authenticated
@Tag(name = "Comentarios")
public class CommentResource {
    private final CommentService service;
    private final JsonWebToken jwt;

    public CommentResource(CommentService service, JsonWebToken jwt) {
        this.service = service;
        this.jwt = jwt;
    }

    @POST
    @Path("/{id}/comentarios")
    @Consumes(MediaType.APPLICATION_JSON)
    @Operation(summary = "Comenta una publicación o responde a un comentario",
            description = "texto: 1–280 caracteres (sin espacios extremos). Con respondeA crea una respuesta a ese "
                    + "comentario, que debe pertenecer a la misma publicación. El autor se obtiene del JWT.")
    @APIResponseSchema(value = CommentResponse.class, responseCode = "201",
            responseDescription = "Comentario creado")
    @APIResponse(responseCode = "400", description = "VALIDACION: texto vacío o de más de 280 caracteres, o "
            + "\"El hilo alcanzó la profundidad máxima\" si respondeA ya está en el nivel 50")
    @APIResponse(responseCode = "401", description = "JWT ausente o inválido")
    @APIResponse(responseCode = "404", description = "POST_NO_ENCONTRADO, COMENTARIO_NO_ENCONTRADO si respondeA "
            + "no existe o es de otra publicación, o USUARIO_NO_ENCONTRADO si el usuario ya no existe")
    public Response create(@PathParam("id") String postId, CommentRequest request) {
        // No Location header: comments are read through the post thread, not one by one.
        return Response.status(Response.Status.CREATED)
                .entity(service.create(jwt.getSubject(), postId, request)).build();
    }

    @GET
    @Path("/{id}/comentarios")
    @Operation(summary = "Comentarios de una publicación con sus hilos de respuestas",
            description = "Lista plana de todos los comentarios del hilo, respuestas incluidas, ordenada por fecha "
                    + "ascendente. respondeA indica de qué comentario cuelga cada respuesta.")
    @APIResponse(responseCode = "200", description = "Comentarios del hilo; vacía si no hay")
    @APIResponse(responseCode = "401", description = "JWT ausente o inválido")
    @APIResponse(responseCode = "404", description = "POST_NO_ENCONTRADO")
    public List<CommentResponse> thread(@PathParam("id") String postId) {
        return service.thread(postId);
    }
}
