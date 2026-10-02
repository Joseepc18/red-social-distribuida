package com.redsocial.posts;

import org.eclipse.microprofile.openapi.annotations.media.Schema;

@Schema(description = "Publicación con autor proyectado; los campos media son null cuando no hay imagen")
public record PostResponse(String id, String texto, String fecha, Author autor,
        String mediaKey, String mediaTipo, String mediaUrl,
        @Schema(description = "Total de comentarios de la publicación, respuestas incluidas") long comentarios) {
    public record Author(String id, String username, String nombre) {
    }
}
