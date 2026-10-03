package com.redsocial.feed;

import java.util.List;

import jakarta.enterprise.context.ApplicationScoped;

import com.redsocial.posts.PostAssembler;
import com.redsocial.posts.PostRepository;
import com.redsocial.posts.PostResponse;
import com.redsocial.posts.PostService;
import com.redsocial.shared.error.ApiException;

@ApplicationScoped
public class FeedService {
    private final FeedRepository repository;
    private final PostRepository posts;
    private final PostAssembler assembler;

    public FeedService(FeedRepository repository, PostRepository posts, PostAssembler assembler) {
        this.repository = repository;
        this.posts = posts;
        this.assembler = assembler;
    }

    public List<PostResponse> find(String userId, int page) {
        if (page < 0) {
            throw ApiException.badRequest("VALIDACION", "page no puede ser negativo");
        }
        if (!posts.authorExists(userId)) {
            throw ApiException.notFound("USUARIO_NO_ENCONTRADO", "El usuario no existe");
        }
        return repository.find(userId, page, PostService.PAGE_SIZE).stream().map(assembler::response).toList();
    }
}
