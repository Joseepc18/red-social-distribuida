package com.redsocial.chat;

public record ChatEvent(String tipo, ChatMessage mensaje) {
    public ChatEvent(ChatMessage message) { this("mensaje", message); }
}
