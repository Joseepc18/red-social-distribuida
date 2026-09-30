package com.redsocial.media;

import java.nio.file.Path;

import jakarta.enterprise.context.ApplicationScoped;

import org.eclipse.microprofile.config.inject.ConfigProperty;

import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

@ApplicationScoped
public class S3MediaStorage implements MediaStorage {
    private final S3Client client;
    private final String bucket;

    public S3MediaStorage(S3Client client, @ConfigProperty(name = "app.media.bucket") String bucket) {
        this.client = client;
        this.bucket = bucket;
    }

    @Override
    public void upload(String key, Path file, String contentType) {
        client.putObject(PutObjectRequest.builder().bucket(bucket).key(key).contentType(contentType).build(),
                RequestBody.fromFile(file));
    }

    @Override
    public void delete(String key) {
        client.deleteObject(DeleteObjectRequest.builder().bucket(bucket).key(key).build());
    }
}
