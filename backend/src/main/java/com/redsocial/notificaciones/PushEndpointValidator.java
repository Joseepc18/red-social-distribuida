package com.redsocial.notificaciones;

import java.net.URI;
import java.net.URISyntaxException;
import java.util.Locale;

import com.redsocial.shared.error.ApiException;

/**
 * Rejects local destinations before storing a browser push endpoint. This is a
 * syntactic check: it never performs DNS during the registration request. DNS
 * changes after registration cannot be prevented by this check alone.
 */
final class PushEndpointValidator {
    private PushEndpointValidator() {
    }

    static void validate(String endpoint) {
        try {
            URI uri = new URI(endpoint);
            String host = uri.getHost();
            if (!"https".equalsIgnoreCase(uri.getScheme()) || host == null
                    || uri.getRawUserInfo() != null || uri.getRawFragment() != null
                    || uri.getPort() == 0 || uri.getPort() > 65535
                    || !publicHostname(host)) {
                throw invalid();
            }
        } catch (URISyntaxException | IllegalArgumentException failure) {
            throw invalid();
        }
    }

    private static boolean publicHostname(String host) {
        String normalized = host.toLowerCase(Locale.ROOT);
        while (normalized.endsWith(".")) {
            normalized = normalized.substring(0, normalized.length() - 1);
        }
        // URI.getHost() may include the brackets around an IPv6 literal.
        if (normalized.contains(":") || normalized.startsWith("[")
                || normalized.equals("localhost") || normalized.endsWith(".localhost")
                || normalized.endsWith(".local") || normalized.endsWith(".internal")) {
            return false;
        }
        String[] labels = normalized.split("\\.", -1);
        if (labels.length < 2) {
            return false;
        }
        for (String label : labels) {
            if (label.length() > 63 || !label.matches("[a-z0-9](?:[a-z0-9-]*[a-z0-9])?")) {
                return false;
            }
        }
        String topLevel = labels[labels.length - 1];
        return !topLevel.matches("[0-9]+|0x[0-9a-f]+") && normalized.length() <= 253;
    }

    private static ApiException invalid() {
        return ApiException.badRequest("VALIDACION", "endpoint: debe ser una URL HTTPS de un servicio push público");
    }
}
