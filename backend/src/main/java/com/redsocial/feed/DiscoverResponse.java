package com.redsocial.feed;

import org.eclipse.microprofile.openapi.annotations.media.Schema;

import com.redsocial.posts.PostResponse;

@Schema(description = "Publicación descubierta por reacciones de los seguidos; campos media null sin imagen")
public record DiscoverResponse(String id, String texto, String fecha, PostResponse.Author autor,
        String mediaKey, String mediaTipo, String mediaUrl,
        @Schema(description = "Cantidad de usuarios distintos que sigo y reaccionaron a esta publicación",
                minimum = "1") long amigosQueReaccionaron) {
}
