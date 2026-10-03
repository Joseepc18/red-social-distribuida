package com.redsocial.posts;

import static org.junit.jupiter.api.Assertions.*;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import com.redsocial.media.ImageValidator;
import com.redsocial.shared.error.ApiException;

class PostServiceTest {
    @TempDir Path directory;

    @Test
    void removesUploadedImageWhenAuthorDisappearsBeforeCreate() throws Exception {
        TestMediaStorage storage = new TestMediaStorage();
        PostRepository repository = new PostRepository(null) {
            @Override public boolean authorExists(String id) { return true; }
            @Override public Optional<StoredPost> create(String id, String author, String text, String key, String type) {
                assertTrue(storage.objects().containsKey(key));
                return Optional.empty();
            }
        };
        // No Event is supplied: reaching event dispatch on a failed write would be a bug.
        PostService service = new PostService(repository, storage, new ImageValidator(), null,
                new PostAssembler("/media/"));
        Path image = Files.write(directory.resolve("image.png"), PostResourceTest.image("png"));
        ApiException failure = assertThrows(ApiException.class,
                () -> service.create("deleted-author", "Hello", image, "image/png"));
        assertEquals(404, failure.status());
        assertTrue(storage.objects().isEmpty(), "Uploaded object must be compensated after a failed graph write");
    }

}
