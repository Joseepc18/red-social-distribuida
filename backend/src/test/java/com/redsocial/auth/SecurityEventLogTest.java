package com.redsocial.auth;

import static io.restassured.RestAssured.given;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;
import java.util.Map;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.logging.Handler;
import java.util.logging.Level;
import java.util.logging.LogRecord;
import java.util.logging.Logger;

import org.junit.jupiter.api.Test;

import io.quarkus.test.junit.QuarkusTest;
import io.restassured.http.ContentType;

@QuarkusTest
class SecurityEventLogTest {

    @Test
    void failedLoginLogsAttemptedUsernameWithoutPassword() {
        String username = TestUsers.randomUsername();
        String password = "secret-do-not-log-987";
        try (CapturedLogs logs = new CapturedLogs(AuthService.class.getName())) {
            given().contentType(ContentType.JSON)
                    .body(Map.of("username", username, "password", password))
                    .when().post("/api/auth/login")
                    .then().statusCode(401);

            assertTrue(logs.messages().stream().anyMatch(message -> message.contains(username)));
            assertFalse(logs.messages().stream().anyMatch(message -> message.contains(password)));
            assertTrue(logs.allWarn());
        }
    }

    @Test
    void rejectedRegistrationsLogStatusWithoutSensitiveFields() {
        String username = TestUsers.randomUsername();
        given().contentType(ContentType.JSON)
                .body(TestUsers.registration(username, username + "@test.com"))
                .when().post("/api/auth/registro")
                .then().statusCode(201);

        try (CapturedLogs logs = new CapturedLogs("com.redsocial.auth.SecurityEventFilter")) {
            given().contentType(ContentType.JSON)
                    .body(TestUsers.registration(username, "other_" + username + "@test.com"))
                    .when().post("/api/auth/registro")
                    .then().statusCode(409);
            given().contentType(ContentType.JSON)
                    .body(Map.of("username", "", "email", "", "password", "secret-do-not-log-987", "nombre", ""))
                    .when().post("/api/auth/registro")
                    .then().statusCode(400);

            assertTrue(logs.messages().stream().anyMatch(message -> message.contains("Registro rechazado")
                    && message.contains("409")));
            assertTrue(logs.messages().stream().anyMatch(message -> message.contains("Registro rechazado")
                    && message.contains("400")));
            assertFalse(logs.messages().stream().anyMatch(message -> message.contains("secret-do-not-log-987")));
            assertTrue(logs.allWarn());
        }
    }

    private static final class CapturedLogs implements AutoCloseable {
        private final Logger logger;
        private final Level oldLevel;
        private final List<LogRecord> records = new CopyOnWriteArrayList<>();
        private final Handler handler = new Handler() {
            @Override
            public void publish(LogRecord record) {
                records.add(record);
            }

            @Override
            public void flush() {
            }

            @Override
            public void close() {
            }
        };

        CapturedLogs(String category) {
            logger = Logger.getLogger(category);
            oldLevel = logger.getLevel();
            logger.setLevel(Level.ALL);
            handler.setLevel(Level.ALL);
            logger.addHandler(handler);
        }

        List<String> messages() {
            return records.stream().map(LogRecord::getMessage).toList();
        }

        boolean allWarn() {
            return !records.isEmpty() && records.stream()
                    .allMatch(record -> record.getLevel().intValue() == Level.WARNING.intValue());
        }

        @Override
        public void close() {
            logger.removeHandler(handler);
            logger.setLevel(oldLevel);
        }
    }
}
