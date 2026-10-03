package com.redsocial.posts;

import java.nio.file.Path;
import java.util.List;
import java.util.UUID;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.event.Event;

import org.jboss.logging.Logger;

import com.redsocial.media.ImageValidator;
import com.redsocial.media.MediaStorage;
import com.redsocial.shared.PostCreated;
import com.redsocial.shared.error.ApiException;

@ApplicationScoped
public class PostService {
    public static final int PAGE_SIZE = 20;
    static final String LIKE = "LIKE";
    private static final Logger LOG = Logger.getLogger(PostService.class);
    private final PostRepository repository;
    private final MediaStorage storage;
    private final ImageValidator images;
    private final Event<PostCreated> events;
    private final PostAssembler assembler;

    public PostService(PostRepository repository, MediaStorage storage, ImageValidator images,
            Event<PostCreated> events, PostAssembler assembler) {
        this.repository = repository;
        this.storage = storage;
        this.images = images;
        this.events = events;
        this.assembler = assembler;
    }

    public PostResponse create(String authorId, String text, Path file, String declaredType) {
        String normalized = text == null ? "" : text.strip();
        if (normalized.isBlank() || normalized.codePointCount(0, normalized.length()) > 5000) {
            throw ApiException.badRequest("VALIDACION", "texto debe contener entre 1 y 5000 caracteres");
        }
        if (!repository.authorExists(authorId)) {
            throw missingUser();
        }
        String id = UUID.randomUUID().toString();
        String key = null;
        String type = null;
        if (file != null) {
            var image = images.validate(file, declaredType);
            type = image.contentType();
            key = "posts/" + id + "/" + UUID.randomUUID() + "." + image.extension();
            try {
                storage.upload(key, file, type);
            } catch (RuntimeException failure) {
                cleanup(key);
                LOG.errorf(failure, "Image upload failed for post %s", id);
                throw new ApiException(503, "ALMACENAMIENTO_NO_DISPONIBLE", "No se pudo guardar la imagen; intenta nuevamente");
            }
        }
        PostRepository.StoredPost stored;
        try {
            stored = repository.create(id, authorId, normalized, key, type).orElseThrow(PostService::missingUser);
        } catch (RuntimeException failure) {
            if (key != null) {
                cleanup(key);
            }
            throw failure;
        }
        // Do not wait for push delivery or emit inside a retried Neo4j transaction.
        try {
            events.fireAsync(new PostCreated(id, authorId, normalized))
                    .whenComplete((event, failure) -> {
                        if (failure != null) {
                            LOG.errorf(failure, "PostCreated observer failed for post %s", id);
                        }
                    });
        } catch (RuntimeException failure) {
            // A committed post remains successful even if event dispatch is unavailable.
            LOG.errorf(failure, "PostCreated dispatch failed for post %s", id);
        }
        return assembler.response(stored);
    }

    public PostResponse find(String id, String viewerId) {
        return assembler.response(repository.find(id, viewerId).orElseThrow(PostService::postNotFound));
    }

    public void react(String userId, String postId) {
        requirePost(postId);
        if (!repository.react(userId, postId, LIKE)) {
            throw missingUser();
        }
    }

    public void unreact(String userId, String postId) {
        requirePost(postId);
        repository.unreact(userId, postId);
    }

    public List<PostResponse> byAuthor(String authorId, String viewerId, int page) {
        if (page < 0) {
            throw ApiException.badRequest("VALIDACION", "page no puede ser negativo");
        }
        if (!repository.authorExists(authorId)) {
            throw missingUser();
        }
        return repository.byAuthor(authorId, viewerId, page, PAGE_SIZE).stream().map(assembler::response).toList();
    }

    private void cleanup(String key) {
        try {
            storage.delete(key);
        } catch (RuntimeException failure) {
            LOG.errorf(failure, "Could not remove orphan object %s; manual cleanup may be needed", key);
        }
    }

    private void requirePost(String id) {
        if (!repository.exists(id)) {
            throw postNotFound();
        }
    }

    private static ApiException postNotFound() {
        return ApiException.notFound("POST_NO_ENCONTRADO", "La publicación no existe");
    }

    private static ApiException missingUser() {
        return ApiException.notFound("USUARIO_NO_ENCONTRADO", "El usuario no existe");
    }
}
