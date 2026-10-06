package com.redsocial.comentarios;

import org.eclipse.microprofile.openapi.annotations.media.Schema;

import com.redsocial.usuarios.UserSummary;

@Schema(description = "Comentario con su autor proyectado")
public record CommentResponse(String id, String texto, String fecha, UserSummary autor,
        @Schema(description = "Id del comentario respondido; null en los comentarios directos", nullable = true)
        String respondeA,
        @Schema(description = "Cantidad de respuestas directas a este comentario") long respuestas) {
}
