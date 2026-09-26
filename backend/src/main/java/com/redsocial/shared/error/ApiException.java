package com.redsocial.shared.error;

import jakarta.ws.rs.core.Response.Status;

/**
 * Business error thrown by feature code. {@link ExceptionMappers} turns it into
 * an HTTP response with the given status and an {@link ErrorResponse} body.
 *
 * <pre>{@code
 * throw ApiException.notFound("USUARIO_NO_ENCONTRADO", "El usuario no existe");
 * throw ApiException.conflict("USERNAME_EN_USO", "El nombre de usuario ya está en uso");
 * throw new ApiException(422, "CODIGO", "Mensaje");
 * }</pre>
 */
public class ApiException extends RuntimeException {

    private final int status;
    private final String error;

    public ApiException(int status, String error, String mensaje) {
        super(mensaje);
        this.status = status;
        this.error = error;
    }

    public static ApiException badRequest(String error, String mensaje) {
        return new ApiException(Status.BAD_REQUEST.getStatusCode(), error, mensaje);
    }

    public static ApiException unauthorized(String error, String mensaje) {
        return new ApiException(Status.UNAUTHORIZED.getStatusCode(), error, mensaje);
    }

    public static ApiException forbidden(String error, String mensaje) {
        return new ApiException(Status.FORBIDDEN.getStatusCode(), error, mensaje);
    }

    public static ApiException notFound(String error, String mensaje) {
        return new ApiException(Status.NOT_FOUND.getStatusCode(), error, mensaje);
    }

    public static ApiException conflict(String error, String mensaje) {
        return new ApiException(Status.CONFLICT.getStatusCode(), error, mensaje);
    }

    public int status() {
        return status;
    }

    public String error() {
        return error;
    }

    public String mensaje() {
        return getMessage();
    }
}
