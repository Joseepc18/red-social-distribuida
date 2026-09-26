package com.redsocial.usuarios;

import java.util.List;

import jakarta.enterprise.context.ApplicationScoped;

import com.redsocial.shared.error.ApiException;

@ApplicationScoped
public class UserService {

    static final int SEARCH_LIMIT = 20;

    private final UserRepository repository;

    public UserService(UserRepository repository) {
        this.repository = repository;
    }

    /**
     * Profile of the user identified by the token subject. If that user no longer exists
     * (e.g. the database was reseeded while the token is still valid) the token no longer
     * represents anyone, so the answer is 401 and the frontend sends the user back to login.
     */
    public OwnProfile ownProfile(String userId) {
        return repository.findOwnProfile(userId).orElseThrow(UserService::accountGone);
    }

    public OwnProfile updateOwnProfile(String userId, UpdateProfileRequest request) {
        String bio = request.bio() == null ? "" : request.bio().trim();
        return repository.updateProfile(userId, request.nombre().trim(), bio)
                .orElseThrow(UserService::accountGone);
    }

    public PublicProfile publicProfile(String id) {
        return repository.findPublicProfile(id)
                .orElseThrow(() -> ApiException.notFound("USUARIO_NO_ENCONTRADO", "El usuario no existe"));
    }

    /** A blank query returns an empty list instead of every user. */
    public List<UserSummary> search(String text) {
        if (text == null || text.isBlank()) {
            return List.of();
        }
        return repository.search(text.trim(), SEARCH_LIMIT);
    }

    private static ApiException accountGone() {
        return ApiException.unauthorized("USUARIO_NO_ENCONTRADO", "La cuenta asociada al token ya no existe");
    }
}
