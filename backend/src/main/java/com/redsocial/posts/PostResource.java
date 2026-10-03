package com.redsocial.posts;

import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.DELETE;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.Context;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.core.UriInfo;

import org.eclipse.microprofile.jwt.JsonWebToken;
import org.eclipse.microprofile.openapi.annotations.Operation;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponseSchema;
import org.eclipse.microprofile.openapi.annotations.tags.Tag;
import org.jboss.resteasy.reactive.RestForm;
import org.jboss.resteasy.reactive.multipart.FileUpload;

import io.quarkus.security.Authenticated;

@Path("/posts")
@Produces(MediaType.APPLICATION_JSON)
@Authenticated
@Tag(name = "Publicaciones")
public class PostResource {
    private final PostService service;
    private final JsonWebToken jwt;

    public PostResource(PostService service, JsonWebToken jwt) {
        this.service = service;
        this.jwt = jwt;
    }

    @POST
    @Consumes(MediaType.MULTIPART_FORM_DATA)
    @Operation(summary = "Crea una publicación con imagen opcional",
            description = "texto: 1–5000 caracteres (sin espacios extremos). archivo opcional: PNG, JPEG o GIF, "
                    + "máximo 5 MiB y 20 megapíxeles en el primer fotograma. El autor se obtiene del JWT.")
    @APIResponseSchema(value = PostResponse.class, responseCode = "201", responseDescription = "Publicación creada")
    @APIResponse(responseCode = "400", description = "Texto o imagen inválidos")
    @APIResponse(responseCode = "401", description = "JWT ausente o inválido")
    @APIResponse(responseCode = "404", description = "El autor ya no existe")
    @APIResponse(responseCode = "413", description = "Imagen superior a 5 MiB o petición superior al límite HTTP")
    @APIResponse(responseCode = "415", description = "Formato de imagen o MIME no soportado")
    @APIResponse(responseCode = "503", description = "Almacenamiento no disponible")
    public Response create(@RestForm("texto") String text, @RestForm("archivo") FileUpload file,
            @Context UriInfo uri) {
        PostResponse post = service.create(jwt.getSubject(), text,
                file == null ? null : file.uploadedFile(), file == null ? null : file.contentType());
        return Response.created(uri.getAbsolutePathBuilder().path(post.id()).build()).entity(post).build();
    }

    @GET
    @Path("/{id}")
    @Operation(summary = "Consulta una publicación y su autor",
            description = "Incluye reacciones, reaccionado (por el usuario del JWT) y comentarios.")
    @APIResponseSchema(value = PostResponse.class, responseCode = "200")
    @APIResponse(responseCode = "401", description = "JWT ausente o inválido")
    @APIResponse(responseCode = "404", description = "POST_NO_ENCONTRADO")
    public PostResponse find(@PathParam("id") String id) {
        return service.find(id, jwt.getSubject());
    }

    @POST
    @Path("/{id}/reacciones")
    @Operation(summary = "Reacciona a una publicación",
            description = "Crea una reacción LIKE del usuario del JWT. Idempotente: reaccionar de nuevo no la "
                    + "duplica ni cambia su fecha.")
    @APIResponse(responseCode = "204", description = "Reacción registrada")
    @APIResponse(responseCode = "401", description = "JWT ausente o inválido")
    @APIResponse(responseCode = "404", description = "POST_NO_ENCONTRADO, o USUARIO_NO_ENCONTRADO si el usuario ya no existe")
    public void react(@PathParam("id") String id) {
        service.react(jwt.getSubject(), id);
    }

    @DELETE
    @Path("/{id}/reacciones")
    @Operation(summary = "Quita la reacción a una publicación",
            description = "Elimina la reacción del usuario del JWT. Idempotente: responde 204 aunque no exista.")
    @APIResponse(responseCode = "204", description = "Reacción eliminada")
    @APIResponse(responseCode = "401", description = "JWT ausente o inválido")
    @APIResponse(responseCode = "404", description = "POST_NO_ENCONTRADO")
    public void unreact(@PathParam("id") String id) {
        service.unreact(jwt.getSubject(), id);
    }
}
