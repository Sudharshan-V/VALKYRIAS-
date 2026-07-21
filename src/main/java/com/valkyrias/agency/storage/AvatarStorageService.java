package com.valkyrias.agency.storage;

import java.util.UUID;

public interface AvatarStorageService {
    String upload(UUID ownerId, ValidatedAvatar avatar);
    void delete(String objectPath);
    String createSignedUrl(String objectPath);
}
