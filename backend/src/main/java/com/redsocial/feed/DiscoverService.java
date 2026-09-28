package com.redsocial.feed;

import java.util.List;

import jakarta.enterprise.context.ApplicationScoped;

import org.eclipse.microprofile.config.inject.ConfigProperty;

import com.redsocial.posts.PostRepository;
import com.redsocial.shared.error.ApiException;

@ApplicationScoped
public class DiscoverService {
    private final DiscoverRepository repository;
    private final PostRepository posts;
    private final String publicBase;

    public DiscoverService(DiscoverRepository repository, PostRepository posts,
            @ConfigProperty(name = "app.media.public-url") String publicBase) {
        this.repository = repository;
        this.posts = posts;
        this.publicBase = publicBase.endsWith("/") ? publicBase : publicBase + "/";
    }

    public List<DiscoverResponse> find(String userId) {
        if (!posts.authorExists(userId)) {
            throw ApiException.notFound("USUARIO_NO_ENCONTRADO", "El usuario no existe");
        }
        return repository.find(userId).stream().map(entry -> {
            var post = entry.post();
            return new DiscoverResponse(post.id(), post.text(), post.date(), post.author(),
                    post.mediaKey(), post.mediaType(), post.mediaKey() == null ? null : publicBase + post.mediaKey(),
                    entry.friendsWhoReacted());
        }).toList();
    }
}
