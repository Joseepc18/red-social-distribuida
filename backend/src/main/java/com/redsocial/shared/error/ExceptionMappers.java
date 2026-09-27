package com.redsocial.shared.error;

import java.util.stream.Collectors;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.ConstraintViolationException;
import jakarta.ws.rs.WebApplicationException;
import jakarta.ws.rs.core.HttpHeaders;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.core.Response.Status;

import org.jboss.logging.Logger;
import org.jboss.resteasy.reactive.server.ServerExceptionMapper;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.exc.MismatchedInputException;

import io.quarkus.security.AuthenticationFailedException;
import io.quarkus.security.ForbiddenException;
import io.quarkus.security.UnauthorizedException;

/**
 * Maps every exception that reaches the REST layer to the common
 * {@code { "error", "mensaje" }} body. The most specific mapper wins, so
 * {@link #unexpected(Throwable)} only handles what nothing else matched.
 */
public class ExceptionMappers {

    private static final Logger LOG = Logger.getLogger(ExceptionMappers.class);

    @ServerExceptionMapper
    public Response api(ApiException e) {
        return build(e.status(), e.error(), e.mensaje());
    }

    @ServerExceptionMapper
    public Response validation(ConstraintViolationException e) {
        String mensaje = e.getConstraintViolations().stream()
                .map(ExceptionMappers::describe)
                .sorted()
                .collect(Collectors.joining("; "));
        return build(Status.BAD_REQUEST.getStatusCode(), "VALIDACION", mensaje);
    }

    @ServerExceptionMapper
    public Response invalidJson(JsonProcessingException e) {
        return build(Status.BAD_REQUEST.getStatusCode(), "SOLICITUD_INVALIDA",
                "El cuerpo de la solicitud no es un JSON válido");
    }

    // Declared explicitly so it takes precedence over the built-in Jackson mapper for this subtype.
    @ServerExceptionMapper
    public Response mismatchedJson(MismatchedInputException e) {
        return invalidJson(e);
    }

    // Missing token on a protected endpoint.
    @ServerExceptionMapper
    public Response unauthorized(UnauthorizedException e) {
        return notAuthenticated();
    }

    // Invalid, expired or wrongly signed token.
    @ServerExceptionMapper
    public Response authenticationFailed(AuthenticationFailedException e) {
        return notAuthenticated();
    }

    @ServerExceptionMapper
    public Response forbidden(ForbiddenException e) {
        return build(Status.FORBIDDEN.getStatusCode(), "PROHIBIDO",
                "No tienes permiso para realizar esta acción");
    }

    // Framework errors: unknown route, wrong method, unsupported media type, etc.
    @ServerExceptionMapper
    public Response web(WebApplicationException e) {
        int status = e.getResponse().getStatus();
        return switch (status) {
            case 400 -> build(status, "SOLICITUD_INVALIDA", "La solicitud no es válida");
            case 404 -> build(status, "NO_ENCONTRADO", "El recurso solicitado no existe");
            case 405 -> build(status, "METODO_NO_PERMITIDO", "Método HTTP no permitido para este recurso");
            case 406 -> build(status, "NO_ACEPTABLE", "Formato de respuesta no soportado");
            case 415 -> build(status, "TIPO_NO_SOPORTADO", "Tipo de contenido no soportado");
            default -> status >= 500
                    ? unexpected(e)
                    : build(status, "ERROR_SOLICITUD", "No se pudo procesar la solicitud");
        };
    }

    @ServerExceptionMapper
    public Response unexpected(Throwable e) {
        LOG.error("Unhandled exception", e);
        return build(Status.INTERNAL_SERVER_ERROR.getStatusCode(), "ERROR_INTERNO",
                "Ocurrió un error inesperado");
    }

    private static Response notAuthenticated() {
        return Response.fromResponse(build(Status.UNAUTHORIZED.getStatusCode(), "NO_AUTENTICADO",
                        "Se requiere un token de acceso válido"))
                .header(HttpHeaders.WWW_AUTHENTICATE, "Bearer")
                .build();
    }

    private static String describe(ConstraintViolation<?> violation) {
        String path = violation.getPropertyPath().toString();
        // Parameter paths look like "method.arg0.field"; keep only the field name.
        String field = path.substring(path.lastIndexOf('.') + 1);
        return field + ": " + violation.getMessage();
    }

    private static Response build(int status, String error, String mensaje) {
        return Response.status(status)
                .type(MediaType.APPLICATION_JSON)
                .entity(new ErrorResponse(error, mensaje))
                .build();
    }
}
