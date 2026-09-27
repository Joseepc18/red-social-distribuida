package com.redsocial.notificaciones;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.math.BigInteger;
import java.net.ServerSocket;
import java.net.Socket;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.interfaces.ECPrivateKey;
import java.security.interfaces.ECPublicKey;
import java.security.spec.ECGenParameterSpec;
import java.time.Duration;
import java.util.Base64;
import java.util.Optional;
import java.util.concurrent.TimeoutException;

import org.junit.jupiter.api.Test;

import io.quarkus.test.junit.QuarkusTest;

/**
 * Uses the real library against a local socket that accepts the request and never answers.
 * Runs inside Quarkus so BouncyCastle is registered by the application configuration.
 */
@QuarkusTest
class WebPushSenderTest {

    @Test
    void hungPushServiceTimesOutInsteadOfBlockingForever() throws Exception {
        KeyPair vapid = p256();
        KeyPair browser = p256();
        VapidConfig config = new VapidConfig() {
            public Optional<String> publicKey() {
                return Optional.of(encodedPublicKey(vapid));
            }

            public Optional<String> privateKey() {
                return Optional.of(b64(unsigned32(((ECPrivateKey) vapid.getPrivate()).getS())));
            }

            public Optional<String> subject() {
                return Optional.of("mailto:test@redsocial.local");
            }
        };
        WebPushSender sender = new WebPushSender(config, Duration.ofMillis(300));

        try (ServerSocket hung = new ServerSocket(0)) {
            acceptWithoutAnswering(hung);
            PushTarget target = new PushTarget("user", "http://127.0.0.1:" + hung.getLocalPort() + "/push",
                    encodedPublicKey(browser), b64(new byte[16]));

            long start = System.nanoTime();
            assertThrows(TimeoutException.class, () -> sender.send(target, "{}"));
            assertTrue(Duration.ofNanos(System.nanoTime() - start).toMillis() < 5000);
        }
    }

    // Keeps the accepted connection open without ever writing a response.
    private static void acceptWithoutAnswering(ServerSocket server) {
        Thread.ofVirtual().start(() -> {
            try (Socket client = server.accept()) {
                Thread.sleep(10_000);
            } catch (Exception closed) {
                // The test finished and closed the server.
            }
        });
    }

    private static KeyPair p256() throws Exception {
        KeyPairGenerator generator = KeyPairGenerator.getInstance("EC");
        generator.initialize(new ECGenParameterSpec("secp256r1"));
        return generator.generateKeyPair();
    }

    // Uncompressed point (0x04 || X || Y), the format browsers and VAPID use.
    private static String encodedPublicKey(KeyPair pair) {
        var point = ((ECPublicKey) pair.getPublic()).getW();
        byte[] encoded = new byte[65];
        encoded[0] = 0x04;
        System.arraycopy(unsigned32(point.getAffineX()), 0, encoded, 1, 32);
        System.arraycopy(unsigned32(point.getAffineY()), 0, encoded, 33, 32);
        return b64(encoded);
    }

    private static byte[] unsigned32(BigInteger value) {
        byte[] raw = value.toByteArray();
        byte[] out = new byte[32];
        int length = Math.min(raw.length, 32);
        System.arraycopy(raw, raw.length - length, out, 32 - length, length);
        return out;
    }

    private static String b64(byte[] bytes) {
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }
}
