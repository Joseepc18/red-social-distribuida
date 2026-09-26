package com.redsocial.usuarios;

import java.util.List;

import jakarta.enterprise.context.ApplicationScoped;

import com.redsocial.shared.error.ApiException;

@ApplicationScoped
public class UserService {

    private final UserRepository repository;

    public UserService(UserRepository repository) {
        this.repository = repository;
    }

    public Profile profile(String id) {
        return repository.findProfile(id).orElseThrow(UserService::notFound);
    }

    public Profile updateOwnProfile(String userId, UpdateProfileRequest request) {
        String bio = request.bio() == null ? "" : request.bio().trim();
        return repository.updateProfile(userId, request.nombre().trim(), bio)
                .orElseThrow(UserService::notFound);
    }

    public List<UserSummary> search(String text) {
        return repository.search(text);
    }

    private static ApiException notFound() {
        return ApiException.notFound("USUARIO_NO_ENCONTRADO", "El usuario no existe");
    }
}
