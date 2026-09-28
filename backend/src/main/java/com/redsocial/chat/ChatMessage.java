package com.redsocial.chat;

public record ChatMessage(String id, String conversacionId, String autorId, String texto, String fecha) {
}
