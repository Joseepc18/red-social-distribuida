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
        PostService service = new PostService(repository, storage, new ImageValidator(), null, "/media/");
        Path image = Files.write(directory.resolve("image.png"), PostResourceTest.image("png"));
        ApiException failure = assertThrows(ApiException.class,
                () -> service.create("deleted-author", "Hello", image, "image/png"));
        assertEquals(404, failure.status());
        assertTrue(storage.objects().isEmpty(), "Uploaded object must be compensated after a failed graph write");
    }

    @Test
    void buildsUrlFromConfiguredBaseWithoutPersistingIt() {
        PostRepository repository = new PostRepository(null) {
            @Override public Optional<StoredPost> find(String id) {
                return Optional.of(new StoredPost(id, "Hi", "2026-09-27T00:00:00Z",
                        new PostResponse.Author("author", "user", "Name"), "posts/p/image.png", "image/png"));
            }
        };
        PostService service = new PostService(repository, null, null, null, "https://example.test/media");
        assertEquals("https://example.test/media/posts/p/image.png", service.find("p").mediaUrl());
    }
}
