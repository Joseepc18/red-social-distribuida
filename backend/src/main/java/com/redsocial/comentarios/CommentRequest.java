package com.redsocial.comentarios;

import org.eclipse.microprofile.openapi.annotations.media.Schema;

@Schema(description = "Comentario nuevo; sin respondeA es un comentario directo a la publicación")
public record CommentRequest(
        @Schema(description = "1–280 caracteres, sin contar los espacios de los extremos", required = true)
        String texto,
        @Schema(description = "Id del comentario al que responde, de la misma publicación", nullable = true)
        String respondeA) {
}
