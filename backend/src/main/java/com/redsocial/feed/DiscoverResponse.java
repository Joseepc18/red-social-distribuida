package com.redsocial.feed;

import org.eclipse.microprofile.openapi.annotations.media.Schema;

import com.fasterxml.jackson.annotation.JsonUnwrapped;
import com.redsocial.posts.PostResponse;

/** The common post fields, flattened, plus the only field "Para ti" adds. */
@Schema(description = "Publicación descubierta por reacciones de los seguidos: los mismos campos que en el feed "
        + "y amigosQueReaccionaron")
public record DiscoverResponse(@JsonUnwrapped PostResponse post,
        @Schema(description = "Cantidad de usuarios distintos que sigo y reaccionaron a esta publicación",
                minimum = "1") long amigosQueReaccionaron) {
}
