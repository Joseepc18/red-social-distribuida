package com.redsocial.shared.error;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.not;

import org.junit.jupiter.api.Test;

import io.quarkus.test.junit.QuarkusTest;
import io.restassured.http.ContentType;

@QuarkusTest
class ErrorHandlingTest {

    @Test
    void unknownRouteReturnsCommonFormat() {
        given()
                .when().get("/api/no-existe")
                .then()
                .statusCode(404)
                .contentType(ContentType.JSON)
                .body("error", is("NO_ENCONTRADO"))
                .body("mensaje", is("El recurso solicitado no existe"));
    }

    @Test
    void apiExceptionKeepsStatusCodeAndMessage() {
        given()
                .when().get("/api/test-only/api-exception")
                .then()
                .statusCode(409)
                .contentType(ContentType.JSON)
                .body("error", is("PRUEBA_CONFLICTO"))
                .body("mensaje", is("Mensaje de prueba"));
    }

    @Test
    void unexpectedExceptionDoesNotLeakDetails() {
        given()
                .when().get("/api/test-only/boom")
                .then()
                .statusCode(500)
                .contentType(ContentType.JSON)
                .body("error", is("ERROR_INTERNO"))
                .body(not(containsString("internal detail")));
    }

    @Test
    void validationErrorReturns400() {
        given()
                .contentType(ContentType.JSON)
                .body("{\"nombre\": \"\"}")
                .when().post("/api/test-only/validation")
                .then()
                .statusCode(400)
                .contentType(ContentType.JSON)
                .body("error", is("VALIDACION"))
                .body("mensaje", containsString("nombre"));
    }

    @Test
    void malformedJsonReturns400() {
        given()
                .contentType(ContentType.JSON)
                .body("{ not json")
                .when().post("/api/test-only/validation")
                .then()
                .statusCode(400)
                .contentType(ContentType.JSON)
                .body("error", is("SOLICITUD_INVALIDA"));
    }

    @Test
    void wrongMethodReturns405() {
        given()
                .when().delete("/api/info")
                .then()
                .statusCode(405)
                .contentType(ContentType.JSON)
                .body("error", is("METODO_NO_PERMITIDO"));
    }
}
