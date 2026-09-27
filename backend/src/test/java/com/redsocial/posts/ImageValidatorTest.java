package com.redsocial.posts;

import static org.junit.jupiter.api.Assertions.*;

import java.nio.ByteBuffer;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Arrays;
import java.util.zip.CRC32;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import com.redsocial.media.ImageValidator;
import com.redsocial.shared.error.ApiException;

class ImageValidatorTest {
    @TempDir Path directory;

    @Test
    void rejectsTruncatedImageAndExcessiveDimensionsBeforeDecoding() throws Exception {
        ImageValidator validator = new ImageValidator();
        byte[] valid = PostResourceTest.image("png");
        Path truncated = Files.write(directory.resolve("broken.png"), Arrays.copyOf(valid, 30));
        assertThrows(ApiException.class, () -> validator.validate(truncated, "image/png"));

        // Change the PNG IHDR dimensions and CRC without allocating a huge bitmap.
        byte[] huge = valid.clone();
        ByteBuffer.wrap(huge).putInt(16, 5001).putInt(20, 4000);
        CRC32 crc = new CRC32();
        crc.update(huge, 12, 17);
        ByteBuffer.wrap(huge).putInt(29, (int) crc.getValue());
        Path excessive = Files.write(directory.resolve("huge.png"), huge);
        ApiException failure = assertThrows(ApiException.class, () -> validator.validate(excessive, "image/png"));
        assertEquals(400, failure.status());
        assertTrue(failure.mensaje().contains("20 megapíxeles"));
    }
}
