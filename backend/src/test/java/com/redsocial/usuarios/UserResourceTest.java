package com.redsocial.usuarios;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.empty;
import static org.hamcrest.Matchers.endsWith;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.hasKey;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.lessThanOrEqualTo;
import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.notNullValue;
import static org.hamcrest.Matchers.nullValue;

import java.util.Map;
import java.util.UUID;

import jakarta.inject.Inject;

import org.junit.jupiter.api.Test;
import org.neo4j.driver.Driver;

import com.redsocial.auth.TestUsers;
import com.redsocial.auth.TestUsers.TestUser;

import io.quarkus.test.junit.QuarkusTest;
import io.restassured.http.ContentType;
import io.smallrye.jwt.build.Jwt;

@QuarkusTest
class UserResourceTest {

    @Inject
    Driver driver;

    @Test
    void protectedEndpointsRequireToken() {
        for (String path : new String[] { "/api/usuarios/me", "/api/usuarios/" + UUID.randomUUID(), "/api/usuarios?q=a" }) {
            given()
                    .when().get(path)
                    .then()
                    .statusCode(401)
                    .body("error", is("NO_AUTENTICADO"));
        }
        given()
                .contentType(ContentType.JSON)
                .body(Map.of("nombre", "X"))
                .when().put("/api/usuarios/me")
                .then()
                .statusCode(401)
                .body("error", is("NO_AUTENTICADO"));
    }

    @Test
    void meReturnsOwnProfileFromTheToken() {
        TestUser user = TestUsers.create();

        given()
                .auth().oauth2(user.token())
                .when().get("/api/usuarios/me")
                .then()
                .statusCode(200)
                .body("id", is(user.id()))
                .body("username", is(user.username()))
                .body("email", is(user.email()))
                .body("creadoEn", notNullValue())
                .body(not(containsString("passwordHash")));
    }

    @Test
    void meWithTokenOfMissingUserReturns401() {
        String token = Jwt.subject(UUID.randomUUID().toString()).sign();

        given()
                .auth().oauth2(token)
                .when().get("/api/usuarios/me")
                .then()
                .statusCode(401)
                .body("error", is("USUARIO_NO_ENCONTRADO"));
    }

    @Test
    void updateMeChangesOnlyNombreAndBio() {
        TestUser user = TestUsers.create();

        given()
                .auth().oauth2(user.token())
                .contentType(ContentType.JSON)
                .body(Map.of("nombre", "  Nuevo Nombre ", "bio", "Hola mundo",
                        "username", "hackeado", "email", "hackeado@test.com", "id", "otro-id"))
                .when().put("/api/usuarios/me")
                .then()
                .statusCode(200)
                .body("id", is(user.id()))
                .body("nombre", is("Nuevo Nombre"))
                .body("bio", is("Hola mundo"))
                .body("username", is(user.username()))
                .body("email", is(user.email()))
                .body(not(containsString("passwordHash")));

        given()
                .auth().oauth2(user.token())
                .when().get("/api/usuarios/me")
                .then()
                .statusCode(200)
                .body("nombre", is("Nuevo Nombre"))
                .body("username", is(user.username()));
    }

    @Test
    void updateMeValidatesFields() {
        TestUser user = TestUsers.create();

        given()
                .auth().oauth2(user.token())
                .contentType(ContentType.JSON)
                .body(Map.of("nombre", " ", "bio", "x".repeat(161)))
                .when().put("/api/usuarios/me")
                .then()
                .statusCode(400)
                .body("error", is("VALIDACION"))
                .body("mensaje", containsString("nombre"))
                .body("mensaje", containsString("bio"));
    }

    @Test
    void byIdReturnsPublicProfileWithFollowCounts() {
        TestUser viewer = TestUsers.create();
        TestUser target = TestUsers.create();
        TestUser other = TestUsers.create();
        // SIGUE relationships are created directly: this test only checks the profile counts.
        driver.executableQuery("""
                        MATCH (v:Usuario {id: $viewer}), (t:Usuario {id: $target}), (o:Usuario {id: $other})
                        CREATE (v)-[:SIGUE {desde: datetime()}]->(t),
                               (o)-[:SIGUE {desde: datetime()}]->(t),
                               (t)-[:SIGUE {desde: datetime()}]->(o)
                        """)
                .withParameters(Map.of("viewer", viewer.id(), "target", target.id(), "other", other.id()))
                .execute();

        given()
                .auth().oauth2(viewer.token())
                .when().get("/api/usuarios/" + target.id())
                .then()
                .statusCode(200)
                .body("id", is(target.id()))
                .body("username", is(target.username()))
                .body("nombre", is("Nombre " + target.username()))
                .body("seguidores", is(2))
                .body("seguidos", is(1))
                .body("email", nullValue())
                .body(not(containsString("passwordHash")))
                .body(not(containsString(target.email())));
    }

    @Test
    void byIdOfUnknownUserReturns404() {
        TestUser viewer = TestUsers.create();

        given()
                .auth().oauth2(viewer.token())
                .when().get("/api/usuarios/" + UUID.randomUUID())
                .then()
                .statusCode(404)
                .body("error", is("USUARIO_NO_ENCONTRADO"));
    }

    @Test
    void searchMatchesUsernameOrNombreIgnoringCase() {
        TestUser viewer = TestUsers.create();
        String tag = UUID.randomUUID().toString().replace("-", "").substring(0, 8);
        TestUser byNombre = TestUsers.create();
        given()
                .auth().oauth2(byNombre.token())
                .contentType(ContentType.JSON)
                .body(Map.of("nombre", "Buscado " + tag.toUpperCase()))
                .when().put("/api/usuarios/me")
                .then().statusCode(200);

        given()
                .auth().oauth2(viewer.token())
                .queryParam("q", tag)
                .when().get("/api/usuarios")
                .then()
                .statusCode(200)
                .body("id", contains(byNombre.id()))
                .body("[0].username", is(byNombre.username()))
                .body(not(containsString("passwordHash")))
                .body(not(containsString("email")));

        given()
                .auth().oauth2(viewer.token())
                .queryParam("q", viewer.username().toUpperCase())
                .when().get("/api/usuarios")
                .then()
                .statusCode(200)
                .body("id", hasItem(viewer.id()));
    }

    @Test
    void searchIsLimitedTo20() {
        TestUser viewer = TestUsers.create();

        given()
                .auth().oauth2(viewer.token())
                .queryParam("q", "u_")
                .when().get("/api/usuarios")
                .then()
                .statusCode(200)
                .body("size()", lessThanOrEqualTo(UserService.SEARCH_LIMIT));
    }

    @Test
    void blankSearchReturnsEmptyList() {
        TestUser viewer = TestUsers.create();

        given()
                .auth().oauth2(viewer.token())
                .queryParam("q", "  ")
                .when().get("/api/usuarios")
                .then()
                .statusCode(200)
                .body("$", empty());

        given()
                .auth().oauth2(viewer.token())
                .when().get("/api/usuarios")
                .then()
                .statusCode(200)
                .body("$", empty());
    }

    @Test
    void tooLongSearchReturns400() {
        TestUser viewer = TestUsers.create();

        given()
                .auth().oauth2(viewer.token())
                .queryParam("q", "x".repeat(51))
                .when().get("/api/usuarios")
                .then()
                .statusCode(400)
                .body("error", is("VALIDACION"));
    }

    @Test
    void openApiDocumentsTheEndpointsAndTheirSecurity() {
        given()
                .queryParam("format", "json")
                .when().get("/api/openapi")
                .then()
                .statusCode(200)
                .body("paths.'/api/auth/registro'.post.responses.'201'.content.'application/json'.schema.'$ref'",
                        endsWith("/OwnProfile"))
                .body("paths.'/api/auth/login'.post.responses.'200'.content.'application/json'.schema.'$ref'",
                        endsWith("/LoginResponse"))
                .body("paths.'/api/usuarios/{id}'.get.responses.'200'.content.'application/json'.schema.'$ref'",
                        endsWith("/PublicProfile"))
                .body("components.schemas.OwnProfile.properties", not(hasKey("passwordHash")))
                .body("paths.'/api/auth/registro'.post.responses.'409'", notNullValue())
                .body("paths.'/api/auth/login'.post.responses.'401'", notNullValue())
                .body("paths.'/api/auth/login'.post.security", nullValue())
                .body("paths.'/api/usuarios/me'.get.security[0]", hasKey("SecurityScheme"))
                .body("paths.'/api/usuarios/me'.put", notNullValue())
                .body("paths.'/api/usuarios/{id}'.get.responses.'404'", notNullValue())
                .body("paths.'/api/usuarios'.get", notNullValue());
    }
}
