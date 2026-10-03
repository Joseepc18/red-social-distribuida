package com.redsocial.posts;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import com.redsocial.posts.PostRepository.StoredPost;

class PostAssemblerTest {
    private static final PostResponse.Author AUTHOR = new PostResponse.Author("author", "user", "Name");

    @ParameterizedTest
    @ValueSource(strings = {"https://example.test/media", "https://example.test/media/"})
    void buildsMediaUrlFromTheConfiguredBaseAndKeepsTheCounters(String publicBase) {
        var assembler = new PostAssembler(publicBase);

        PostResponse response = assembler.response(new StoredPost("p1", "Hi", "2026-09-27T00:00:00Z", AUTHOR,
                "posts/p1/image.png", "image/png", 4, true, 7));

        assertEquals("https://example.test/media/posts/p1/image.png", response.mediaUrl());
        assertEquals(4, response.reacciones());
        assertTrue(response.reaccionado());
        assertEquals(7, response.comentarios());
    }

    @ParameterizedTest
    @ValueSource(strings = {"/media", "/media/"})
    void leavesMediaUrlNullWithoutImage(String publicBase) {
        PostResponse response = new PostAssembler(publicBase).response(
                new StoredPost("p2", "Text", "2026-09-27T00:00:00Z", AUTHOR, null, null, 0, false, 0));

        assertNull(response.mediaUrl());
    }
}
