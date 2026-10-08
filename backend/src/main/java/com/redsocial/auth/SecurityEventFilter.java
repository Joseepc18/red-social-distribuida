package com.redsocial.auth;

import java.io.IOException;

import jakarta.ws.rs.container.ContainerRequestContext;
import jakarta.ws.rs.container.ContainerResponseContext;
import jakarta.ws.rs.container.ContainerResponseFilter;
import jakarta.ws.rs.ext.Provider;

import org.jboss.logging.Logger;

/** Records rejected registration requests without reading or logging request bodies. */
@Provider
public class SecurityEventFilter implements ContainerResponseFilter {

    private static final Logger LOG = Logger.getLogger(SecurityEventFilter.class);

    @Override
    public void filter(ContainerRequestContext request, ContainerResponseContext response) throws IOException {
        if (!"POST".equals(request.getMethod()) || response.getStatus() < 400) {
            return;
        }
        String path = request.getUriInfo().getPath();
        if (path.endsWith("auth/registro")) {
            LOG.warnf("Registro rechazado status=%d", response.getStatus());
        } else if (path.endsWith("auth/login") && response.getStatus() == 400) {
            LOG.warn("Inicio de sesión rechazado status=400");
        }
    }
}
