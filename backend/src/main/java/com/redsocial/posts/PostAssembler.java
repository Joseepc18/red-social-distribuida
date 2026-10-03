package com.redsocial.posts;

import jakarta.enterprise.context.ApplicationScoped;

import org.eclipse.microprofile.config.inject.ConfigProperty;

/** Turns a stored post into the public response; the only place that builds mediaUrl. */
@ApplicationScoped
public class PostAssembler {
    private final String publicBase;

    public PostAssembler(@ConfigProperty(name = "app.media.public-url") String publicBase) {
        this.publicBase = publicBase.endsWith("/") ? publicBase : publicBase + "/";
    }

    public PostResponse response(PostRepository.StoredPost post) {
        return new PostResponse(post.id(), post.text(), post.date(), post.author(), post.mediaKey(),
                post.mediaType(), post.mediaKey() == null ? null : publicBase + post.mediaKey(),
                post.reactions(), post.reacted(), post.comments());
    }
}
