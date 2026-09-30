package com.redsocial.chat;

import java.util.List;

/** Internal Redis payload. The browser receives only ChatEvent. */
public record ChatEnvelope(ChatMessage mensaje, List<String> participantes) {
}
