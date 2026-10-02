package com.redsocial.feed;

import org.eclipse.microprofile.openapi.annotations.media.Schema;

import com.redsocial.posts.PostResponse;

@Schema(description = "Publicación de un usuario seguido; campos media null cuando no hay imagen")
public record FeedResponse(String id, String texto, String fecha, PostResponse.Author autor,
        String mediaKey, String mediaTipo, String mediaUrl,
        @Schema(description = "Total de reacciones a la publicación") long reacciones,
        @Schema(description = "El usuario autenticado reaccionó a esta publicación") boolean reaccionado,
        @Schema(description = "Total de comentarios de la publicación, respuestas incluidas") long comentarios) {
}
