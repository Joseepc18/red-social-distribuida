package com.redsocial.feed;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.util.List;

import org.junit.jupiter.api.Test;

import com.redsocial.posts.PostAssembler;
import com.redsocial.posts.PostRepository;
import com.redsocial.posts.PostRepository.StoredPost;
import com.redsocial.posts.PostResponse;
import com.redsocial.posts.PostService;
import com.redsocial.shared.error.ApiException;

class DiscoverServiceTest {
    private final PostRepository posts = new PostRepository(null) {
        @Override public boolean authorExists(String id) { return true; }
    };

    @Test
    void returnsTheCommonPostFieldsPlusFriendsWhoReacted() {
        DiscoverRepository repository = new DiscoverRepository(null) {
            @Override public List<Entry> find(String userId, int page, int size) {
                assertEquals(2, page);
                assertEquals(PostService.PAGE_SIZE, size);
                var author = new PostResponse.Author("author", "user", "Name");
                return List.of(new Entry(new StoredPost("p1", "Image", "2026-09-28T00:00:00Z", author,
                        "posts/p1/image.png", "image/png", 3, true, 5), 2));
            }
        };

        var result = new DiscoverService(repository, posts, new PostAssembler("/media/")).find("viewer", 2);

        assertEquals("/media/posts/p1/image.png", result.getFirst().post().mediaUrl());
        assertEquals(3, result.getFirst().post().reacciones());
        assertEquals(5, result.getFirst().post().comentarios());
        assertEquals(2, result.getFirst().amigosQueReaccionaron());
    }

    @Test
    void rejectsNegativePages() {
        var service = new DiscoverService(new DiscoverRepository(null), posts, new PostAssembler("/media/"));

        ApiException failure = assertThrows(ApiException.class, () -> service.find("viewer", -1));

        assertEquals(400, failure.status());
        assertEquals("VALIDACION", failure.error());
    }
}
