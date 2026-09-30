package com.redsocial.media;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Locale;
import java.util.Map;

import javax.imageio.ImageIO;
import javax.imageio.ImageReader;
import javax.imageio.stream.ImageInputStream;

import jakarta.enterprise.context.ApplicationScoped;

import com.redsocial.shared.error.ApiException;

/** Validates actual image data, not the client filename or MIME type alone. */
@ApplicationScoped
public class ImageValidator {
    public static final long MAX_BYTES = 5L * 1024 * 1024;
    private static final long MAX_PIXELS = 20_000_000;
    private static final Map<String, ImageType> TYPES = Map.of(
            "png", new ImageType("image/png", "png"),
            "jpeg", new ImageType("image/jpeg", "jpg"),
            "gif", new ImageType("image/gif", "gif"));

    public record ImageType(String contentType, String extension) {
    }

    public ImageType validate(Path file, String declaredType) {
        try {
            long size = Files.size(file);
            if (size == 0) {
                throw ApiException.badRequest("IMAGEN_INVALIDA", "El archivo está vacío");
            }
            if (size > MAX_BYTES) {
                throw new ApiException(413, "IMAGEN_DEMASIADO_GRANDE", "La imagen no puede superar 5 MiB");
            }
            try (ImageInputStream input = ImageIO.createImageInputStream(file.toFile())) {
                var readers = ImageIO.getImageReaders(input);
                if (!readers.hasNext()) {
                    throw invalidType();
                }
                ImageReader reader = readers.next();
                try {
                    ImageType type = TYPES.get(reader.getFormatName().toLowerCase(Locale.ROOT));
                    String mime = declaredType == null ? "" : declaredType.split(";", 2)[0].strip();
                    if (type == null || !type.contentType().equalsIgnoreCase(mime)) {
                        throw invalidType();
                    }
                    reader.setInput(input, true, true);
                    int width = reader.getWidth(0);
                    int height = reader.getHeight(0);
                    if (width <= 0 || height <= 0 || (long) width * height > MAX_PIXELS) {
                        throw ApiException.badRequest("IMAGEN_INVALIDA", "La imagen no puede superar 20 megapíxeles");
                    }
                    // Decode the first frame as well, to reject corrupt image data.
                    if (reader.read(0) == null) {
                        throw invalidType();
                    }
                    return type;
                } finally {
                    reader.dispose();
                }
            }
        } catch (IOException e) {
            throw ApiException.badRequest("IMAGEN_INVALIDA", "No se pudo leer una imagen válida");
        }
    }

    private static ApiException invalidType() {
        return new ApiException(415, "TIPO_IMAGEN_NO_SOPORTADO",
                "Se admiten imágenes PNG, JPEG o GIF con su tipo MIME correspondiente");
    }
}
