package com.redsocial.chat;

import java.nio.charset.StandardCharsets;
import java.time.ZonedDateTime;
import java.util.Base64;
import java.util.UUID;
import com.redsocial.shared.error.ApiException;

/** Versioned keyset cursor scoped to a conversation; never an offset. */
record MessageCursor(String date, String id) {
    static MessageCursor decode(String cursor, String conversation) {
        if (cursor == null) return null;
        try {
            if (cursor.isBlank() || cursor.length() > 1024) throw new IllegalArgumentException();
            String[] parts = new String(Base64.getUrlDecoder().decode(cursor), StandardCharsets.UTF_8).split("\n", -1);
            if (parts.length != 4 || !parts[0].equals("1") || !parts[1].equals(conversation)) {
                throw new IllegalArgumentException();
            }
            ZonedDateTime.parse(parts[2]);
            UUID.fromString(parts[3]);
            return new MessageCursor(parts[2], parts[3]);
        } catch (RuntimeException failure) {
            throw ApiException.badRequest("CURSOR_INVALIDO", "El cursor antes no es válido para esta conversación");
        }
    }

    static String encode(ChatMessage message) {
        return Base64.getUrlEncoder().withoutPadding().encodeToString(
                ("1\n" + message.conversacionId() + "\n" + message.fecha() + "\n" + message.id())
                        .getBytes(StandardCharsets.UTF_8));
    }
}
