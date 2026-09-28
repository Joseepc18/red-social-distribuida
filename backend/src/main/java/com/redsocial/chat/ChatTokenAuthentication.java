package com.redsocial.chat;

import java.time.Instant;
import java.util.Set;
import jakarta.enterprise.context.ApplicationScoped;
import org.eclipse.microprofile.jwt.JsonWebToken;
import io.quarkus.security.AuthenticationFailedException;
import io.quarkus.security.identity.IdentityProviderManager;
import io.quarkus.security.identity.SecurityIdentity;
import io.quarkus.security.identity.request.AuthenticationRequest;
import io.quarkus.security.identity.request.TokenAuthenticationRequest;
import io.quarkus.smallrye.jwt.runtime.auth.JsonWebTokenCredential;
import io.quarkus.vertx.http.runtime.security.ChallengeData;
import io.quarkus.vertx.http.runtime.security.HttpAuthenticationMechanism;
import io.quarkus.vertx.http.runtime.security.HttpSecurityUtils;
import io.smallrye.mutiny.Uni;
import io.vertx.ext.web.RoutingContext;

/** Only /ws/chat accepts a query token. REST keeps its Authorization header mechanism. */
@ApplicationScoped
public class ChatTokenAuthentication implements HttpAuthenticationMechanism {
    @Override
    public Uni<SecurityIdentity> authenticate(RoutingContext context, IdentityProviderManager identities) {
        if (!context.normalizedPath().equals("/ws/chat")) return Uni.createFrom().nullItem();
        var tokens = context.queryParam("token");
        if (tokens.size() != 1 || tokens.getFirst().isBlank() || tokens.getFirst().length() > 16384) {
            return Uni.createFrom().failure(new AuthenticationFailedException());
        }
        context.put(HttpAuthenticationMechanism.class.getName(), this);
        var request = new TokenAuthenticationRequest(new JsonWebTokenCredential(tokens.getFirst()));
        return identities.authenticate(HttpSecurityUtils.setRoutingContextAttribute(request, context)).map(identity -> {
            if (!(identity.getPrincipal() instanceof JsonWebToken jwt) || jwt.getSubject() == null
                    || jwt.getSubject().isBlank() || jwt.getExpirationTime() <= Instant.now().getEpochSecond()) {
                throw new AuthenticationFailedException();
            }
            return identity;
        });
    }

    @Override public Uni<ChallengeData> getChallenge(RoutingContext context) {
        return Uni.createFrom().item(new ChallengeData(401, "WWW-Authenticate", "Bearer"));
    }

    @Override public Set<Class<? extends AuthenticationRequest>> getCredentialTypes() {
        return Set.of(TokenAuthenticationRequest.class);
    }

    @Override public int getPriority() { return 2000; }
}
