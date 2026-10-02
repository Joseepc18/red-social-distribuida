package com.redsocial.feed;

import java.util.List;

import jakarta.enterprise.context.ApplicationScoped;

import org.eclipse.microprofile.config.inject.ConfigProperty;

import com.redsocial.posts.PostRepository;
import com.redsocial.posts.PostService;
import com.redsocial.shared.error.ApiException;

@ApplicationScoped
public class FeedService {
    private final FeedRepository repository;
    private final PostRepository posts;
    private final String publicBase;

    public FeedService(FeedRepository repository, PostRepository posts,
            @ConfigProperty(name = "app.media.public-url") String publicBase) {
        this.repository = repository;
        this.posts = posts;
        this.publicBase = publicBase.endsWith("/") ? publicBase : publicBase + "/";
    }

    public List<FeedResponse> find(String userId, int page) {
        if (page < 0) {
            throw ApiException.badRequest("VALIDACION", "page no puede ser negativo");
        }
        if (!posts.authorExists(userId)) {
            throw ApiException.notFound("USUARIO_NO_ENCONTRADO", "El usuario no existe");
        }
        return repository.find(userId, page, PostService.PAGE_SIZE).stream().map(entry -> {
            var post = entry.post();
            return new FeedResponse(post.id(), post.text(), post.date(), post.author(),
                    post.mediaKey(), post.mediaType(), post.mediaKey() == null ? null : publicBase + post.mediaKey(),
                    entry.reactions(), entry.reacted(), post.comments());
        }).toList();
    }
}
