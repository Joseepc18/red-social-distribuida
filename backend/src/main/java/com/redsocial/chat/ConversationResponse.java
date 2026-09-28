package com.redsocial.chat;

import com.redsocial.usuarios.UserSummary;

public record ConversationResponse(String id, String creadaEn, UserSummary participante) {
}
