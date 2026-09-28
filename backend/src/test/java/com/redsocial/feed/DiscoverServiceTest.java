package com.redsocial.feed;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

import java.util.List;

import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import com.redsocial.posts.PostRepository;
import com.redsocial.posts.PostRepository.StoredPost;
import com.redsocial.posts.PostResponse;

class DiscoverServiceTest {
    @ParameterizedTest
    @ValueSource(strings = {"https://example.test/media", "https://example.test/media/"})
    void buildsMediaUrlsFromTheConfiguredBaseAndPreservesMissingImages(String publicBase) {
        DiscoverRepository repository = new DiscoverRepository(null) {
            @Override public List<Entry> find(String userId) {
                var author = new PostResponse.Author("author", "user", "Name");
                return List.of(
                        new Entry(new StoredPost("p1", "Image", "2026-09-28T00:00:00Z", author,
                                "posts/p1/image.png", "image/png"), 2),
                        new Entry(new StoredPost("p2", "Text", "2026-09-28T00:00:00Z", author,
                                null, null), 1));
            }
        };
        PostRepository posts = new PostRepository(null) {
            @Override public boolean authorExists(String id) { return true; }
        };
        var result = new DiscoverService(repository, posts, publicBase).find("viewer");
        assertEquals("https://example.test/media/posts/p1/image.png", result.getFirst().mediaUrl());
        assertNull(result.getLast().mediaUrl());
    }
}
