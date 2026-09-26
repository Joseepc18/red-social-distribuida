package com.redsocial.auth;

import java.util.UUID;

import jakarta.enterprise.context.ApplicationScoped;

import org.neo4j.driver.exceptions.Neo4jException;

import com.redsocial.auth.AuthRepository.Credentials;
import com.redsocial.shared.error.ApiException;
import com.redsocial.usuarios.Profile;
import com.redsocial.usuarios.UserService;

import io.quarkus.elytron.security.common.BcryptUtil;
import io.smallrye.jwt.build.Jwt;

@ApplicationScoped
public class AuthService {

    private static final String CONSTRAINT_VIOLATION = "Neo.ClientError.Schema.ConstraintValidationFailed";

    private final AuthRepository repository;
    private final UserService users;

    public AuthService(AuthRepository repository, UserService users) {
        this.repository = repository;
        this.users = users;
    }

    public Profile register(RegisterRequest request) {
        String id = UUID.randomUUID().toString();
        try {
            repository.create(id, request.username(), request.email(), BcryptUtil.bcryptHash(request.password()),
                    request.nombre().trim());
        } catch (Neo4jException e) {
            if (!CONSTRAINT_VIOLATION.equals(e.code())) {
                throw e;
            }
            // The driver's message is not a stable contract, so ask the graph which value is taken.
            // The id is a fresh random UUID, so the conflict is the username or the email.
            if (repository.usernameExists(request.username())) {
                throw ApiException.conflict("USERNAME_EN_USO", "El nombre de usuario ya está en uso");
            }
            throw ApiException.conflict("EMAIL_EN_USO", "El email ya está registrado");
        }
        return users.profile(id);
    }

    public LoginResponse login(LoginRequest request) {
        Credentials credentials = repository.findCredentials(request.username())
                .filter(c -> BcryptUtil.matches(request.password(), c.passwordHash()))
                .orElseThrow(() -> ApiException.unauthorized("CREDENCIALES_INVALIDAS",
                        "Usuario o contraseña incorrectos"));
        // Issuer and 24 h lifespan come from smallrye.jwt.new-token.* in application.properties.
        String token = Jwt.subject(credentials.id())
                .upn(credentials.username())
                .sign();
        return new LoginResponse(token);
    }
}
