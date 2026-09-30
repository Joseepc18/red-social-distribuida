package com.redsocial.chat;

import io.smallrye.mutiny.Uni;

public interface ChatBroker {
    Uni<Void> publish(ChatEnvelope message);
}
