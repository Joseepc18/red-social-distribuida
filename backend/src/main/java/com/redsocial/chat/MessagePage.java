package com.redsocial.chat;

import java.util.List;
import org.eclipse.microprofile.openapi.annotations.media.Schema;

public record MessagePage(List<ChatMessage> mensajes,
        @Schema(description = "Cursor opaco para ?antes=; null cuando no quedan mensajes anteriores", nullable = true)
        String siguienteAntes) {
}
