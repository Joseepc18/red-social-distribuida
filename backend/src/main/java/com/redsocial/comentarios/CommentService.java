package com.redsocial.comentarios;

import java.util.List;
import java.util.UUID;

import jakarta.enterprise.context.ApplicationScoped;

import com.redsocial.shared.error.ApiException;

@ApplicationScoped
public class CommentService {
    static final int MAX_LENGTH = 280;
    private final CommentRepository repository;

    public CommentService(CommentRepository repository) {
        this.repository = repository;
    }

    public CommentResponse create(String authorId, String postId, CommentRequest request) {
        String text = request == null || request.texto() == null ? "" : request.texto().strip();
        if (text.isEmpty() || text.codePointCount(0, text.length()) > MAX_LENGTH) {
            throw ApiException.badRequest("VALIDACION", "texto debe contener entre 1 y 280 caracteres");
        }
        requirePost(postId);
        if (!repository.userExists(authorId)) {
            throw ApiException.notFound("USUARIO_NO_ENCONTRADO", "El usuario no existe");
        }
        String id = UUID.randomUUID().toString();
        String parentId = request.respondeA();
        if (parentId == null) {
            return repository.comment(id, authorId, postId, text).orElseThrow(CommentService::postNotFound);
        }
        return repository.reply(id, authorId, postId, parentId, text)
                .orElseThrow(() -> ApiException.notFound("COMENTARIO_NO_ENCONTRADO",
                        "El comentario no existe en esta publicación"));
    }

    public List<CommentResponse> thread(String postId) {
        requirePost(postId);
        return repository.thread(postId);
    }

    private void requirePost(String id) {
        if (!repository.postExists(id)) {
            throw postNotFound();
        }
    }

    private static ApiException postNotFound() {
        return ApiException.notFound("POST_NO_ENCONTRADO", "La publicación no existe");
    }
}
