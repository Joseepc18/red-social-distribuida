package com.redsocial.auth;

import java.util.Locale;
import java.util.UUID;

import jakarta.enterprise.context.ApplicationScoped;

import org.neo4j.driver.exceptions.Neo4jException;

import com.redsocial.auth.AuthRepository.Credentials;
import com.redsocial.shared.error.ApiException;
import com.redsocial.usuarios.OwnProfile;
import com.redsocial.usuarios.UserService;

import io.quarkus.elytron.security.common.BcryptUtil;
import io.smallrye.jwt.build.Jwt;

@ApplicationScoped
public class AuthService {

    private static final String CONSTRAINT_VIOLATION = "Neo.ClientError.Schema.ConstraintValidationFailed";

    // Checked when the login does not exist, so a missing user costs the same BCrypt time
    // as a wrong password and response times do not reveal which usernames exist.
    private static final String DUMMY_HASH = BcryptUtil.bcryptHash(UUID.randomUUID().toString());

    private final AuthRepository repository;
    private final UserService users;

    public AuthService(AuthRepository repository, UserService users) {
        this.repository = repository;
        this.users = users;
    }

    public OwnProfile register(RegisterRequest request) {
        String id = UUID.randomUUID().toString();
        String username = request.username().toLowerCase(Locale.ROOT);
        String email = request.email().toLowerCase(Locale.ROOT);
        try {
            repository.create(id, username, email, BcryptUtil.bcryptHash(request.password()),
                    request.nombre().trim());
        } catch (Neo4jException e) {
            if (!CONSTRAINT_VIOLATION.equals(e.code())) {
                throw e;
            }
            // The driver's message is not a stable contract, so ask the graph which value is taken.
            // The id is a fresh random UUID, so the conflict is the username or the email.
            if (repository.usernameExists(username)) {
                throw ApiException.conflict("USERNAME_EN_USO", "El nombre de usuario ya está en uso");
            }
            throw ApiException.conflict("EMAIL_EN_USO", "El email ya está registrado");
        }
        return users.ownProfile(id);
    }

    public LoginResponse login(LoginRequest request) {
        String login = request.username().trim().toLowerCase(Locale.ROOT);
        Credentials credentials = repository.findCredentials(login).orElse(null);
        String hash = credentials == null ? DUMMY_HASH : credentials.passwordHash();
        boolean valid = BcryptUtil.matches(request.password(), hash);
        if (credentials == null || !valid) {
            // Same error whether the user exists or not: the response does not reveal registered users.
            throw ApiException.unauthorized("CREDENCIALES_INVALIDAS", "Usuario o contraseña incorrectos");
        }
        // Issuer and 24 h lifespan come from smallrye.jwt.new-token.* in application.properties.
        String token = Jwt.subject(credentials.id())
                .upn(credentials.username())
                .claim("username", credentials.username())
                .sign();
        return new LoginResponse(token, users.ownProfile(credentials.id()));
    }
}
