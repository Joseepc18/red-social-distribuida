package com.redsocial.social;

import java.util.List;

import jakarta.enterprise.context.ApplicationScoped;

import com.redsocial.shared.error.ApiException;

/**
 * Business rules for following users. The caller id always comes from the JWT,
 * never from the URL, so nobody can create follows on behalf of someone else.
 */
@ApplicationScoped
public class FollowService {

    private final FollowRepository repository;

    public FollowService(FollowRepository repository) {
        this.repository = repository;
    }

    public void follow(String callerId, String targetId) {
        if (callerId.equals(targetId)) {
            throw ApiException.badRequest("NO_PUEDE_SEGUIRSE", "No puedes seguirte a ti mismo");
        }
        if (!repository.follow(callerId, targetId)) {
            throw ApiException.notFound("USUARIO_NO_ENCONTRADO", "El usuario no existe");
        }
    }

    public void unfollow(String callerId, String targetId) {
        repository.unfollow(callerId, targetId);
    }

    public List<UsuarioResumen> followers(String userId) {
        return repository.followers(userId);
    }

    public List<UsuarioResumen> followed(String userId) {
        return repository.followed(userId);
    }

    /** C2 when the caller follows someone; otherwise the most followed users (cold start). */
    public List<Sugerencia> suggestions(String callerId) {
        return repository.followsAnyone(callerId)
                ? repository.suggestions(callerId)
                : repository.mostFollowed(callerId);
    }
}
