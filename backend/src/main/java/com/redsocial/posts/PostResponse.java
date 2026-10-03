package com.redsocial.posts;

import org.eclipse.microprofile.openapi.annotations.media.Schema;

@Schema(description = "Publicación con autor proyectado y sus contadores; los campos media son null cuando no hay "
        + "imagen. Es la misma forma en el feed, descubrir, el detalle y el perfil.")
public record PostResponse(String id, String texto, String fecha, Author autor,
        String mediaKey, String mediaTipo, String mediaUrl,
        @Schema(description = "Total de reacciones a la publicación") long reacciones,
        @Schema(description = "El usuario autenticado reaccionó a esta publicación") boolean reaccionado,
        @Schema(description = "Total de comentarios de la publicación, respuestas incluidas") long comentarios) {
    public record Author(String id, String username, String nombre) {
    }
}
